# E2E tests for payments
# Usage: run this from the `serveur` directory: `.	ests\e2e_payments.ps1`
$baseUrl = 'http://localhost:3000'

function Invoke-PostJson {
    param($endpoint, $body)
    try {
        $resp = Invoke-RestMethod -Method Post -Uri ($baseUrl + $endpoint) -Body ($body | ConvertTo-Json) -ContentType 'application/json' -ErrorAction Stop
        return @{ success = $true; data = $resp }
    } catch {
        $err = $_.Exception
        if ($err.Response -ne $null) {
            $r = $err.Response
            $stream = $r.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $bodyText = $reader.ReadToEnd()
            return @{ success = $false; status = $r.StatusCode.value__; body = $bodyText }
        } else {
            return @{ success = $false; error = $err.Message }
        }
    }
}

function Create-Client($suffix) {
    $attempt = 0
    while ($attempt -lt 5) {
        $attempt++
        # generate a 10-digit phone (area code 438 + 7 digits)
        $phone = '438' + (Get-Random -Minimum 1000000 -Maximum 9999999)
        $body = @{ nom = ("E2E$suffix"); prenom = ("User$suffix"); telephone = $phone; email = ("e2e.$suffix.$attempt@example.com"); adresse = "100 Test St" }
        $r = Invoke-PostJson '/addClient' $body
        if ($r.success) {
            return $r.data
        } else {
            Write-Host "Create client attempt $attempt failed: status=$($r.status) body=$($r.body)"
            Start-Sleep -Milliseconds 200
        }
    }
    throw "Create client failed after 5 attempts"
}

function Create-Loan($clientId, $montant, $taux, $duree, $date) {
    $body = @{ client_id = $clientId; montant = $montant; taux = $taux; duree = $duree; date = $date }
    $r = Invoke-PostJson '/addLoan' $body
    if ($r.success) { return $r.data } else { throw "Create loan failed: $($r | ConvertTo-Json -Compress)" }
}

function Add-Payment($loanId, $montant, $date, $mode='Cash', $note='') {
    $body = @{ loan_id = $loanId; montant = $montant; date = $date; mode = $mode; note = $note }
    return Invoke-PostJson '/addPaiement' $body
}

Write-Host '--- E2E Payments tests ---'

# 1) Overpay test (should get HTTP 400)
Write-Host "\n[1] Overpay test"
$client = Create-Client 'overpay'
Write-Host "Client: $($client.id)"
$loan = Create-Loan $client.id 1000 5 1 '2026-01-01'
Write-Host "Loan created: id=$($loan.id) montant=$($loan.montant) interets=$($loan.interets) solde=$($loan.solde)"
$totalDu = [math]::Round(($loan.montant + $loan.interets),2)
$over = [math]::Round($totalDu + 10,2)
Write-Host "totalDu = $totalDu ; attempt overpay = $over"
$resp = Add-Payment $loan.id $over (Get-Date -Format 'yyyy-MM-dd') 'Cash' 'Overpay test'
if ($resp.success) { Write-Host "Overpay unexpected SUCCESS: $($resp.data | ConvertTo-Json -Compress)" } else { Write-Host "Overpay expected failure: status=$($resp.status) body=$($resp.body)" }

# 2) Exact on-time pay (should REMBOURSÉ)
Write-Host "\n[2] Exact on-time pay"
$client2 = Create-Client 'exact'
Write-Host "Client: $($client2.id)"
$loan2 = Create-Loan $client2.id 1000 5 1 '2026-01-01'
Write-Host "Loan created: id=$($loan2.id) montant=$($loan2.montant) interets=$($loan2.interets) solde=$($loan2.solde)"
$totalDu2 = [math]::Round(($loan2.montant + $loan2.interets),2)
Write-Host "Paying exact totalDu = $totalDu2 (date = today)"
$resp2 = Add-Payment $loan2.id $totalDu2 (Get-Date -Format 'yyyy-MM-dd') 'Cash' 'Exact pay test'
if ($resp2.success) { Write-Host "Exact pay success: $($resp2.data | ConvertTo-Json -Compress)" } else { Write-Host "Exact pay failed: status=$($resp2.status) body=$($resp2.body)" }

# 3) Full late payment (pay full amount but dated after due date) => should be EN RETARD
Write-Host "\n[3] Full late payment (should remain EN RETARD)"
$client3 = Create-Client 'full_late'
Write-Host "Client: $($client3.id)"
$loan3 = Create-Loan $client3.id 500 5 1 '2026-01-01'
Write-Host "Loan created: id=$($loan3.id) montant=$($loan3.montant) interets=$($loan3.interets) solde=$($loan3.solde)"
$totalDu3 = [math]::Round(($loan3.montant + $loan3.interets),2)
Write-Host "Paying full amount = $totalDu3 with date 2027-01-01"
$resp3 = Add-Payment $loan3.id $totalDu3 '2027-01-01' 'Cash' 'Full late payment test'
if ($resp3.success) { Write-Host "Late full payment response: $($resp3.data | ConvertTo-Json -Compress)" } else { Write-Host "Late full payment failed: status=$($resp3.status) body=$($resp3.body)" }

Write-Host '--- E2E Payments tests finished ---'
