# Docker Container Self-Update Guide

This guide explains how to set up and use the self-update feature for the Kabelkrant Manager running in Docker on Proxmox.

## Overview

The container can update itself by pulling the latest image from GitHub Container Registry and restarting with the new version. This is done through an API endpoint that triggers an update script.

## Prerequisites

1. Docker image must be published to GitHub Container Registry (ghcr.io)
2. Docker socket must be mounted when running the container
3. Container must be run with proper environment variables

## Proxmox Setup

### 1. Build and Push Your Image to GitHub

First, ensure you have a GitHub Actions workflow or manual process to build and push images to ghcr.io.

Example manual build and push:
```bash
# Build the image
docker build -t ghcr.io/YOUR-USERNAME/kabelkrant-manager:latest .

# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR-USERNAME --password-stdin

# Push the image
docker push ghcr.io/YOUR-USERNAME/kabelkrant-manager:latest
```

### 2. Run the Container in Proxmox

When starting your container in Proxmox, you MUST mount the Docker socket and set the required environment variables:

```bash
docker run -d \
  --name kabelkrant-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /path/to/data:/app/data \
  -v /path/to/videos:/videos \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e DOCKER_IMAGE_NAME=ghcr.io/YOUR-USERNAME/kabelkrant-manager \
  -e DOCKER_IMAGE_TAG=latest \
  -e DOCKER_CONTAINER_NAME=kabelkrant-manager \
  -e UPDATE_PASSWORD=your-secure-password-here \
  -e OBS_WEBSOCKET_URL=ws://host.docker.internal:4455 \
  -e OBS_WEBSOCKET_PASSWORD=rtvserver \
  ghcr.io/YOUR-USERNAME/kabelkrant-manager:latest
```

**Important Environment Variables:**
- `DOCKER_IMAGE_NAME` - Full image name (e.g., ghcr.io/username/repo)
- `DOCKER_IMAGE_TAG` - Image tag to pull (default: latest)
- `DOCKER_CONTAINER_NAME` - Name of this container (must match --name)
- `UPDATE_PASSWORD` - Password to protect the update endpoint (**CHANGE THIS!**)

**Critical:** The Docker socket mount (`-v /var/run/docker.sock:/var/run/docker.sock`) is required for the update to work.

### 3. Security Considerations

⚠️ **Mounting the Docker socket gives the container full control over Docker on the host.** This is necessary for self-updating but comes with security implications:

- Only use this on trusted, isolated systems (like your Proxmox server)
- Set a strong `UPDATE_PASSWORD`
- Consider running the container in a dedicated VM if you're concerned about security
- The update endpoint is only available in production mode

## Using the Update Feature

### Method 1: Via the Web Interface (Easiest)

1. Navigate to the **Settings** page in the web interface
2. Scroll down to the **"Container Updaten"** section
3. Enter your update password (set via `UPDATE_PASSWORD` environment variable)
4. Click the **"🔄 Update Container"** button
5. The container will automatically restart with the latest version

### Method 2: API Call

Trigger an update by making a POST request to the update endpoint:

```bash
curl -X POST http://your-proxmox-server:3000/api/admin/update \
  -H "Content-Type: application/json" \
  -d '{"password": "your-secure-password-here"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Update started. Container will restart with the latest image."
}
```

The container will:
1. Pull the latest image from ghcr.io
2. Stop itself
3. Remove the old container
4. Start a new container with the same configuration
5. Your data and videos are preserved in the mounted volumes

### Method 2: Trigger from GitHub Actions

You can add a step to your GitHub Actions workflow to automatically update the container after a successful build:

```yaml
- name: Trigger Container Update
  run: |
    curl -X POST https://your-proxmox-server:3000/api/admin/update \
      -H "Content-Type: application/json" \
      -d '{"password": "${{ secrets.UPDATE_PASSWORD }}"}'
```

### Method 3: Manual Script Execution

If you have shell access to the container:

```bash
docker exec kabelkrant-manager /app/update.sh
```

## Troubleshooting

### Error: "Docker socket not mounted"

**Solution:** Ensure you started the container with `-v /var/run/docker.sock:/var/run/docker.sock`

### Error: "Unauthorized"

**Solution:** Check that the password in your request matches the `UPDATE_PASSWORD` environment variable

### Error: "Update only available in production mode"

**Solution:** Ensure `NODE_ENV=production` is set (this is the default in the Dockerfile)

### Container doesn't update

1. Check the container logs: `docker logs kabelkrant-manager`
2. Verify the image name is correct: `docker pull ghcr.io/YOUR-USERNAME/kabelkrant-manager:latest`
3. Ensure the Docker socket has proper permissions
4. Check that the container has network access to pull images

## Update Workflow

Here's the complete workflow for updating your application:

1. **Make code changes** in your development environment
2. **Commit and push** to your repository
3. **Build and push** Docker image to ghcr.io (manually or via GitHub Actions)
4. **Trigger update** via API call or GitHub Actions
5. **Container automatically**:
   - Pulls new image
   - Stops old container
   - Starts new container
   - Preserves all data and settings

## What Gets Preserved

When updating, the following are preserved:
- All mounted volumes (data, videos)
- Port mappings
- Environment variables
- Restart policy

## What Gets Updated

- Application code
- Dependencies
- System packages (in the container)

## Rollback

If you need to rollback to a previous version:

1. Stop the container: `docker stop kabelkrant-manager`
2. Remove it: `docker rm kabelkrant-manager`
3. Run with a specific version tag:
   ```bash
   docker run -d ... -e DOCKER_IMAGE_TAG=v1.0.0 ...
   ```

Or use Docker image tags/digests for version control.

## Best Practices

1. **Use specific version tags** for production (e.g., `v1.2.3`) instead of `latest`
2. **Test updates** in a development environment first
3. **Keep backups** of your data volume
4. **Monitor logs** after updates: `docker logs -f kabelkrant-manager`
5. **Set a strong UPDATE_PASSWORD** and store it securely
6. Consider using **GitHub releases** to manage versions

## Example: Complete Setup Script

Save this as `deploy-kabelkrant.sh`:

```bash
#!/bin/bash
set -e

# Configuration
CONTAINER_NAME="kabelkrant-manager"
IMAGE_NAME="ghcr.io/YOUR-USERNAME/kabelkrant-manager"
IMAGE_TAG="latest"
UPDATE_PASSWORD="your-secure-password"
DATA_DIR="/opt/kabelkrant/data"
VIDEOS_DIR="/opt/kabelkrant/videos"

# Create directories if they don't exist
mkdir -p "$DATA_DIR" "$VIDEOS_DIR"

# Pull latest image
docker pull "${IMAGE_NAME}:${IMAGE_TAG}"

# Stop and remove existing container if it exists
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Run new container
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3000:3000 \
  -v "$DATA_DIR:/app/data" \
  -v "$VIDEOS_DIR:/videos" \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e DOCKER_IMAGE_NAME="$IMAGE_NAME" \
  -e DOCKER_IMAGE_TAG="$IMAGE_TAG" \
  -e DOCKER_CONTAINER_NAME="$CONTAINER_NAME" \
  -e UPDATE_PASSWORD="$UPDATE_PASSWORD" \
  -e OBS_WEBSOCKET_URL=ws://host.docker.internal:4455 \
  -e OBS_WEBSOCKET_PASSWORD=rtvserver \
  "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Container deployed successfully!"
echo "Update endpoint: http://localhost:3000/api/admin/update"
```

Make it executable: `chmod +x deploy-kabelkrant.sh`
