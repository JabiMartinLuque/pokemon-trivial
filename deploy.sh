#!/bin/bash

# Script de despliegue para Pokemon Quiz
# Uso: ./deploy.sh [start|stop|restart|logs|update]

set -e

PROJECT_NAME="pokemon-quiz"
COMPOSE_FILE="docker-compose.yml"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # Sin color

# Función para imprimir con color
print_header() {
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Verificar si Docker está instalado
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado"
        echo "Por favor instala Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose no está instalado"
        echo "Por favor instala Docker Compose"
        exit 1
    fi
    
    print_success "Docker y Docker Compose están instalados"
}

# Función para iniciar los servicios
start_services() {
    print_header "Iniciando servicios de Pokemon Quiz"
    
    docker-compose up -d
    
    print_success "Servicios iniciados"
    echo ""
    
    # Esperar a que los servicios estén listos
    print_header "Esperando a que los servicios estén listos..."
    sleep 5
    
    # Verificar salud
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        print_success "Servidor está listo"
    else
        print_warning "Servidor aún no está listo (puede tardar un poco más)"
    fi
    
    if curl -s http://localhost/health > /dev/null 2>&1; then
        print_success "Cliente está listo"
    else
        print_warning "Cliente aún no está listo (puede tardar un poco más)"
    fi
    
    echo ""
    print_header "Acceso a la aplicación"
    echo -e "${GREEN}Local:${NC}         http://localhost"
    echo -e "${GREEN}Dominio:${NC}       http://pokemontrivial.duckdns.org"
    echo -e "${GREEN}Servidor API:${NC}  http://localhost:3001/api/health"
    echo ""
}

# Función para detener los servicios
stop_services() {
    print_header "Deteniendo servicios de Pokemon Quiz"
    docker-compose down
    print_success "Servicios detenidos"
}

# Función para reiniciar los servicios
restart_services() {
    print_header "Reiniciando servicios de Pokemon Quiz"
    docker-compose restart
    print_success "Servicios reiniciados"
}

# Función para ver logs
show_logs() {
    print_header "Logs de Pokemon Quiz (Presiona Ctrl+C para salir)"
    docker-compose logs -f
}

# Función para actualizar el proyecto
update_project() {
    print_header "Actualizando proyecto"
    
    # Obtener cambios
    git pull
    
    print_header "Reconstruyendo y reiniciando contenedores"
    docker-compose down
    docker-compose up -d --build
    
    print_success "Proyecto actualizado"
    sleep 3
    start_services
}

# Función para mostrar status
show_status() {
    print_header "Estado de los servicios"
    docker-compose ps
    echo ""
    
    print_header "Estadísticas"
    docker stats --no-stream
}

# Función para limpiar
cleanup() {
    print_header "Limpiando recursos de Docker"
    docker-compose down -v
    docker system prune -f
    print_success "Limpieza completada"
}

# Función de ayuda
show_help() {
    echo "Pokemon Quiz - Script de Despliegue"
    echo ""
    echo "Uso: ./deploy.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  start       - Iniciar los servicios"
    echo "  stop        - Detener los servicios"
    echo "  restart     - Reiniciar los servicios"
    echo "  logs        - Ver logs en tiempo real"
    echo "  status      - Mostrar estado de los servicios"
    echo "  update      - Actualizar el proyecto desde Git"
    echo "  cleanup     - Eliminar contenedores y volúmenes"
    echo "  help        - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./deploy.sh start"
    echo "  ./deploy.sh logs"
    echo "  ./deploy.sh restart"
}

# Main
main() {
    case "${1:-start}" in
        start)
            check_docker
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        update)
            update_project
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Comando desconocido: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar main
main "$@"
