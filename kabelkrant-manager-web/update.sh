#!/bin/sh
set -e

# Self-update script for Docker container running in Proxmox
# This script pulls the latest image and recreates the container

echo "=== Container Self-Update Script ==="
echo "Starting update process..."

# Get environment variables (these should be set when running the container)
IMAGE_NAME="${DOCKER_IMAGE_NAME:-ghcr.io/your-username/kabelkrant-manager}"
IMAGE_TAG="${DOCKER_IMAGE_TAG:-latest}"
CONTAINER_NAME="${DOCKER_CONTAINER_NAME:-kabelkrant-manager}"

FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"

echo "Image: $FULL_IMAGE"
echo "Container: $CONTAINER_NAME"

# Check if Docker socket is mounted
if [ ! -S /var/run/docker.sock ]; then
    echo "ERROR: Docker socket not mounted!"
    echo "Please run the container with: -v /var/run/docker.sock:/var/run/docker.sock"
    exit 1
fi

# Install Docker CLI if not present (for Alpine)
if ! command -v docker >/dev/null 2>&1; then
    echo "Installing Docker CLI..."
    apk add --no-cache docker-cli
fi

echo "Pulling latest image..."
docker pull "$FULL_IMAGE"

echo "Getting current container configuration..."
# Store current container settings
CURRENT_PORTS=$(docker inspect "$CONTAINER_NAME" --format='{{range $p, $conf := .NetworkSettings.Ports}}{{range $conf}}-p {{.HostPort}}:{{$p}} {{end}}{{end}}')
CURRENT_VOLUMES=$(docker inspect "$CONTAINER_NAME" --format='{{range .Mounts}}-v {{.Source}}:{{.Destination}} {{end}}')
CURRENT_ENV=$(docker inspect "$CONTAINER_NAME" --format='{{range .Config.Env}}-e "{{.}}" {{end}}')

echo "Stopping and removing current container..."
docker stop "$CONTAINER_NAME"
docker rm "$CONTAINER_NAME"

echo "Starting new container with updated image..."
# Reconstruct the docker run command with stored settings
eval "docker run -d \
    --name \"$CONTAINER_NAME\" \
    --restart unless-stopped \
    $CURRENT_PORTS \
    $CURRENT_VOLUMES \
    $CURRENT_ENV \
    \"$FULL_IMAGE\""

echo "Update complete! New container is running."
echo "Container ID: $(docker ps -qf name=$CONTAINER_NAME)"
