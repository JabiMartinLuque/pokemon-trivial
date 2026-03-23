# Script de despliegue para Pokemon Quiz (Windows)
# Uso: .\deploy.ps1 -Action start|stop|restart|logs|update|status|cleanup

param(
    [Parameter(Position = 0)]
    [ValidateSet('start', 'stop', 'restart', 'logs', 'status', 'update', 'cleanup', 'help')]
    [string]$Action = 'start'
)

# Configuración
$ProjectName = "pokemon-quiz"
$ComposeFile = "docker-compose.yml"

# Funciones de utilidad
function Write-Header {
    param([string]$Message)
    Write-Host "═══════════════════════════════════════" -ForegroundColor Blue
    Write-Host "  $Message" -ForegroundColor Blue
    Write-Host "═══════════════════════════════════════" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# Verificar si Docker está instalado
function Test-Docker {
    try {
        $null = docker --version
        Write-Success "Docker está instalado"
        
        $null = docker-compose --version
        Write-Success "Docker Compose está instalado"
        
        return $true
    }
    catch {
        Write-Error-Custom "Docker o Docker Compose no están instalados"
        return $false
    }
}

# Iniciar servicios
function Start-Services {
    Write-Header "Iniciando servicios de Pokemon Quiz"
    
    & docker-compose up -d
    
    Write-Success "Servicios iniciados"
    Write-Host ""
    
    Write-Header "Esperando a que los servicios estén listos..."
    Start-Sleep -Seconds 5
    
    # Verificar salud
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -ErrorAction SilentlyContinue
        Write-Success "Servidor está listo"
    }
    catch {
        Write-Warning-Custom "Servidor aún no está listo (puede tardar un poco más)"
    }
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -ErrorAction SilentlyContinue
        Write-Success "Cliente está listo"
    }
    catch {
        Write-Warning-Custom "Cliente aún no está listo (puede tardar un poco más)"
    }
    
    Write-Host ""
    Write-Header "Acceso a la aplicación"
    Write-Host "Local:         http://localhost" -ForegroundColor Green
    Write-Host "Dominio:       http://pokemontrivial.duckdns.org" -ForegroundColor Green
    Write-Host "Servidor API:  http://localhost:3001/api/health" -ForegroundColor Green
    Write-Host ""
}

# Detener servicios
function Stop-Services {
    Write-Header "Deteniendo servicios de Pokemon Quiz"
    & docker-compose down
    Write-Success "Servicios detenidos"
}

# Reiniciar servicios
function Restart-Services {
    Write-Header "Reiniciando servicios de Pokemon Quiz"
    & docker-compose restart
    Write-Success "Servicios reiniciados"
}

# Ver logs
function Show-Logs {
    Write-Header "Logs de Pokemon Quiz (Presiona Ctrl+C para salir)"
    & docker-compose logs -f
}

# Actualizar proyecto
function Update-Project {
    Write-Header "Actualizando proyecto"
    
    & git pull
    
    Write-Header "Reconstruyendo y reiniciando contenedores"
    & docker-compose down
    & docker-compose up -d --build
    
    Write-Success "Proyecto actualizado"
    Start-Sleep -Seconds 3
    Start-Services
}

# Mostrar estado
function Show-Status {
    Write-Header "Estado de los servicios"
    & docker-compose ps
    Write-Host ""
    
    Write-Header "Estadísticas"
    & docker stats --no-stream
}

# Limpiar
function Cleanup {
    Write-Header "Limpiando recursos de Docker"
    & docker-compose down -v
    & docker system prune -f
    Write-Success "Limpieza completada"
}

# Mostrar ayuda
function Show-Help {
    Write-Host "Pokemon Quiz - Script de Despliegue (Windows)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\deploy.ps1 -Action <comando>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor Cyan
    Write-Host "  start       - Iniciar los servicios"
    Write-Host "  stop        - Detener los servicios"
    Write-Host "  restart     - Reiniciar los servicios"
    Write-Host "  logs        - Ver logs en tiempo real"
    Write-Host "  status      - Mostrar estado de los servicios"
    Write-Host "  update      - Actualizar el proyecto desde Git"
    Write-Host "  cleanup     - Eliminar contenedores y volúmenes"
    Write-Host "  help        - Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Yellow
    Write-Host "  .\deploy.ps1 start"
    Write-Host "  .\deploy.ps1 -Action logs"
    Write-Host "  .\deploy.ps1 restart"
}

# Main
if (-not (Test-Docker)) {
    exit 1
}

Write-Host ""

switch ($Action) {
    'start' {
        Start-Services
    }
    'stop' {
        Stop-Services
    }
    'restart' {
        Restart-Services
    }
    'logs' {
        Show-Logs
    }
    'status' {
        Show-Status
    }
    'update' {
        Update-Project
    }
    'cleanup' {
        Cleanup
    }
    'help' {
        Show-Help
    }
    default {
        Write-Error-Custom "Acción desconocida: $Action"
        Write-Host ""
        Show-Help
        exit 1
    }
}
