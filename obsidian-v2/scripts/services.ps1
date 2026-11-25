param([ValidateSet('Status','Stop','PauseRecovery')][string]$Action='Status', [string]$LogDirectory=(Join-Path $PSScriptRoot '..\.runtime\terminal-test'))
$ErrorActionPreference='Stop'
$taskProject=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if($Action -eq 'PauseRecovery'){
 $taskPause=Join-Path $taskProject '.runtime\services-paused.json'
 [System.IO.File]::WriteAllText($taskPause,'{"reason":"explicit recovery pause"}',[System.Text.UTF8Encoding]::new($false))
 Write-Output 'Recuperação pausada. Os serviços e as conversas ativos continuam em execução. Execute start-recovery.ps1 para reativar a recuperação.'
 exit
}
$taskConfig=Get-Content -LiteralPath (Join-Path $taskProject '.runtime\vault.json') -Raw | ConvertFrom-Json
$taskState=$null
try {$taskState=Invoke-RestMethod 'http://127.0.0.1:3219/state' -TimeoutSec 4} catch {}
if($taskState -and $taskState.vault -ne $taskConfig.vault){throw 'A ponte pertence a outro cofre. Nenhum serviço foi parado.'}
$taskServices=@(@{Name='v2-bridge';Port=3219;Pattern='runner[/\\]bridge\.mjs'},@{Name='preview';Port=3218;Pattern='preview[/\\]server\.mjs'},@{Name='jarvis';Port=3217;Pattern='next[/\\]dist[/\\]bin[/\\]next"?\s+start --hostname 127\.0\.0\.1 --port 3217'})
if($Action -eq 'Status'){
 if($taskState){Invoke-RestMethod 'http://127.0.0.1:3219/services' -TimeoutSec 5 | ConvertTo-Json -Depth 5}else{Write-Output 'Ponte do terminal indisponível.'}
 try{Invoke-RestMethod 'http://127.0.0.1:3221/status' -TimeoutSec 2 | ConvertTo-Json -Depth 5}catch{Write-Output 'Monitor de recuperação indisponível.'}
 exit
}
# Fail closed before stopping any service: no unsent CLI drafts or active agents discarded.
if(!$taskState){throw 'A ponte está indisponível e não foi possível verificar o estado das tarefas. Nenhum serviço foi parado.'}
$taskWork=Invoke-RestMethod 'http://127.0.0.1:3219/work' -TimeoutSec 4
if(@($taskWork.tasks | Where-Object {$_.pid -or $_.state -in @('working','ready','editing','starting','needs input')}).Count){throw 'Encerre primeiro as tarefas ativas em Terminais. Nenhum serviço foi parado.'}
$taskTargets=@()
foreach($taskService in $taskServices){
 $taskListener=Get-NetTCPConnection -LocalPort $taskService.Port -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalAddress -eq '127.0.0.1'} | Select-Object -First 1
 if(!$taskListener){continue}
 $taskProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($taskListener.OwningProcess)"
 if(!$taskProcess -or $taskProcess.Name -ne 'node.exe' -or $taskProcess.CommandLine -notmatch $taskService.Pattern){throw "Processo inesperado na porta $($taskService.Port). Nenhum serviço foi parado."}
 if($taskService.Name -eq 'jarvis'){$taskWeb=Invoke-RestMethod 'http://127.0.0.1:3217/api/state' -TimeoutSec 5;if($taskWeb.vault_root -ne $taskState.vault){throw 'O Jarvis pertence a outro cofre. Nenhum serviço foi parado.'}}
 $taskTargets+=@{Name=$taskService.Name;Id=$taskProcess.ProcessId;Created=$taskProcess.CreationDate}
}
$taskAuth=Get-Content -LiteralPath (Join-Path $taskProject '.runtime\bridge-auth.json') -Raw | ConvertFrom-Json
Invoke-RestMethod 'http://127.0.0.1:3219/shutdown' -Method Post -Headers @{'X-V2-Token'=$taskAuth.token} -ContentType 'application/json' -Body '{}' -TimeoutSec 5 | Out-Null
foreach($taskTarget in $taskTargets | Where-Object {$_.Name -ne 'v2-bridge'}){
 $taskCurrent=Get-CimInstance Win32_Process -Filter "ProcessId=$($taskTarget.Id)"
 if($taskCurrent -and $taskCurrent.CreationDate -eq $taskTarget.Created){Stop-Process -Id $taskTarget.Id;Write-Output "Serviço $($taskTarget.Name) encerrado."}
}
Write-Output 'Os serviços ociosos da web e do terminal do V2 foram encerrados. A recuperação automática está pausada. As conversas salvas e os rascunhos da caixa de mensagem foram preservados. O serviço de voz compartilhado e os serviços originais do V1 continuam em execução. Execute start-recovery.ps1 para iniciar os serviços novamente.'
