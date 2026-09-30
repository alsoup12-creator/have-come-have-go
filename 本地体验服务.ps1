param([switch]$NoBrowser)

$ErrorActionPreference = "Stop"
$rootPath = [System.IO.Path]::GetFullPath($PSScriptRoot)
$allowedFiles = @{
    "/" = "index.html"
    "/index.html" = "index.html"
    "/app.js" = "app.js"
    "/styles.css" = "styles.css"
    "/ui-v1.css" = "ui-v1.css"
    "/assets/ui-v1/backgrounds/today-header.png" = "assets\ui-v1\backgrounds\today-header.png"
    "/assets/ui-v1/backgrounds/records-header.png" = "assets\ui-v1\backgrounds\records-header.png"
    "/assets/ui-v1/backgrounds/clarify-header.png" = "assets\ui-v1\backgrounds\clarify-header.png"
    "/assets/ui-v1/backgrounds/mine-header.png" = "assets\ui-v1\backgrounds\mine-header.png"
    "/assets/ui-v1/icons/today-line.png" = "assets\ui-v1\icons\today-line.png"
    "/assets/ui-v1/icons/today-filled.png" = "assets\ui-v1\icons\today-filled.png"
    "/assets/ui-v1/icons/records-line.png" = "assets\ui-v1\icons\records-line.png"
    "/assets/ui-v1/icons/records-filled.png" = "assets\ui-v1\icons\records-filled.png"
    "/assets/ui-v1/icons/clarify-line.png" = "assets\ui-v1\icons\clarify-line.png"
    "/assets/ui-v1/icons/clarify-filled.png" = "assets\ui-v1\icons\clarify-filled.png"
    "/assets/ui-v1/icons/mine-line.png" = "assets\ui-v1\icons\mine-line.png"
    "/assets/ui-v1/icons/mine-filled.png" = "assets\ui-v1\icons\mine-filled.png"
    "/assets/ui-v1/icons/add-button.png" = "assets\ui-v1\icons\add-button.png"
    "/legal-content.js" = "legal-content.js"
    "/ocr/tesseract.min.js" = "ocr\tesseract.min.js"
    "/ocr/worker.min.js" = "ocr\worker.min.js"
    "/ocr/tesseract-core-lstm.wasm.js" = "ocr\tesseract-core-lstm.wasm.js"
    "/ocr/lang/chi_sim.traineddata.gz" = "ocr\lang\chi_sim.traineddata.gz"
}

$listener = $null
$port = $null
foreach ($candidatePort in 4173..4182) {
    $candidate = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $candidatePort)
    try {
        $candidate.Start()
        $listener = $candidate
        $port = $candidatePort
        break
    }
    catch {
        $candidate.Stop()
    }
}

if ($null -eq $listener) { exit 1 }

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".png" = "image/png"
    ".gz" = "application/gzip"
}

$url = "http://127.0.0.1:$port/"
if (-not $NoBrowser) { Start-Process $url }
$lastRequest = Get-Date

try {
    while ($true) {
        if (-not $listener.Pending()) {
            if (((Get-Date) - $lastRequest).TotalHours -ge 4) { break }
            Start-Sleep -Milliseconds 200
            continue
        }

        $client = $listener.AcceptTcpClient()
        $lastRequest = Get-Date
        try {
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            while (($headerLine = $reader.ReadLine()) -ne $null -and $headerLine -ne "") { }

            $requestParts = @($requestLine -split " ")
            $method = if ($requestParts.Count -ge 1) { $requestParts[0] } else { "" }
            $rawTarget = if ($requestParts.Count -ge 2) { $requestParts[1] } else { "/" }
            $rawPath = ($rawTarget -split "\?", 2)[0]
            $path = [System.Uri]::UnescapeDataString($rawPath)
            $status = "200 OK"
            $contentType = "text/plain; charset=utf-8"
            $bytes = [byte[]]@()

            if (($method -ne "GET" -and $method -ne "HEAD") -or -not $allowedFiles.ContainsKey($path)) {
                $status = "404 Not Found"
                $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
            }
            else {
                $filePath = Join-Path $rootPath $allowedFiles[$path]
                if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                    $status = "404 Not Found"
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes("Not found")
                }
                else {
                    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                    $contentType = $mimeTypes[$extension]
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                }
            }

            $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne "HEAD" -and $bytes.Length -gt 0) {
                $stream.Write($bytes, 0, $bytes.Length)
            }
            $stream.Flush()
            $reader.Dispose()
        }
        finally {
            $client.Close()
        }
    }
}
finally {
    $listener.Stop()
}
