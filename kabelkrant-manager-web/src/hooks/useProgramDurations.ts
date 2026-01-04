import { useState, useEffect } from "react";
import type { ProgramFormSchema } from "@/lib/schemas/program";
import type { VideoFile } from "@/lib/types/FileMetaTypes";
import { getFilesInFolder } from "@/server/functions/files";

export function useProgramDurations(programs: ProgramFormSchema[]) {
  const [programDurations, setProgramDurations] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDurations() {
      setIsLoading(true);
      const durations: Record<string, number> = {};

      for (const program of programs) {
        if (!program.path) continue;

        try {
          const files = await getFilesInFolder({ data: { path: program.path } });
          const videoFiles = files.filter((f) => f.type === "video") as VideoFile[];

          if (program.playAll) {
            // Sum all video durations
            const totalDuration = videoFiles.reduce((sum, file) => sum + (file.duration || 0), 0);
            durations[program.id] = totalDuration;
          } else {
            // Use average or first video duration
            const avgDuration = videoFiles.length > 0 ? videoFiles.reduce((sum, file) => sum + (file.duration || 0), 0) / videoFiles.length : 0;
            durations[program.id] = avgDuration;
          }
        } catch (e) {
          console.error(`Error fetching files for program ${program.id}`, e);
          durations[program.id] = 0;
        }
      }

      setProgramDurations(durations);
      setIsLoading(false);
    }

    fetchDurations();
  }, [programs]);

  return { programDurations, isLoading };
}
