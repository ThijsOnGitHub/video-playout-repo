import fs from 'fs'
import path from 'path'
import type { VideoItem, VideoItems } from '@/lib/types/VideoItem'
import type { FilesWithMetadata, VideoFile } from '@/lib/types/FileMetaTypes'

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm']

export class FileStorage {
  private readonly basePath: string
  private readonly settingsPath: string
  private readonly hasPlayedPath: string

  constructor() {
    // Use environment variable or default to ./data
    this.basePath = process.env.DATA_PATH || './data'
    this.settingsPath = path.join(this.basePath, 'settings.json')
    this.hasPlayedPath = path.join(this.basePath, 'hasPlayed.json')

    // Ensure data directory exists
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true })
    }

    // Initialize files if they don't exist
    if (!fs.existsSync(this.settingsPath)) {
      fs.writeFileSync(this.settingsPath, JSON.stringify([]))
    }
    if (!fs.existsSync(this.hasPlayedPath)) {
      fs.writeFileSync(this.hasPlayedPath, JSON.stringify({}))
    }
  }

  getPrograms(): VideoItems {
    const json = fs.readFileSync(this.settingsPath, 'utf-8')
    return JSON.parse(json)
  }

  savePrograms(programs: VideoItems): void {
    fs.writeFileSync(this.settingsPath, JSON.stringify(programs, null, 2))
  }

  getHasPlayed(): Record<string, Date> {
    const json = fs.readFileSync(this.hasPlayedPath, 'utf-8')
    return JSON.parse(json)
  }

  writePlay(filePath: string): void {
    const data = this.getHasPlayed()
    data[filePath] = new Date()
    fs.writeFileSync(this.hasPlayedPath, JSON.stringify(data, null, 2))
  }

  async getFilesInFolder(folderPath: string): Promise<FilesWithMetadata[]> {
    if (!fs.existsSync(folderPath)) {
      return []
    }

    const files = fs.readdirSync(folderPath)
    const result: FilesWithMetadata[] = []

    for (const file of files) {
      const filePath = path.join(folderPath, file)
      const stat = fs.statSync(filePath)

      if (stat.isFile()) {
        const extension = path.extname(file).toLowerCase()
        const isVideo = VIDEO_EXTENSIONS.includes(extension)

        if (isVideo) {
          let duration: number | undefined
          try {
            // Try to get video duration using get-video-duration
            const { getVideoDurationInSeconds } = await import('get-video-duration')
            duration = await getVideoDurationInSeconds(filePath)
          } catch (e) {
            console.error('Error getting video duration', e)
          }

          const videoFile: VideoFile = {
            name: file,
            path: filePath,
            type: 'video',
            extension,
            duration,
          }
          result.push(videoFile)
        } else {
          result.push({
            name: file,
            path: filePath,
            type: 'file',
            extension,
          })
        }
      }
    }

    return result
  }

  browseDirectory(relativePath: string = ''): { name: string; isDirectory: boolean; path: string }[] {
    const videoBasePath = process.env.VIDEO_BASE_PATH || '/videos'
    const targetPath = path.join(videoBasePath, relativePath)

    // Security: Prevent directory traversal
    const normalizedTarget = path.normalize(targetPath)
    const normalizedBase = path.normalize(videoBasePath)
    if (!normalizedTarget.startsWith(normalizedBase)) {
      throw new Error('Invalid path')
    }

    if (!fs.existsSync(targetPath)) {
      return []
    }

    const entries = fs.readdirSync(targetPath, { withFileTypes: true })
    return entries.map((entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(relativePath, entry.name),
    }))
  }
}

// Singleton instance
let fileStorageInstance: FileStorage | null = null

export function getFileStorage(): FileStorage {
  if (!fileStorageInstance) {
    fileStorageInstance = new FileStorage()
  }
  return fileStorageInstance
}
