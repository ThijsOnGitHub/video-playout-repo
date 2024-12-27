
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { FileVideo } from "lucide-react";
import { FC, useEffect, useState } from "react";



export interface PlaylistProps {
}

export const Playlist: FC<PlaylistProps> = () => {
    const [playlist, setPlaylist] = useState<string[]>([])

    async function updatePlaylist(){
        const playlist = await window.electronApi.getPlaylist()
        setPlaylist(playlist)
    }

    useEffect(() => {
        updatePlaylist()
    }, [])

    return <div className="flex flex-col gap-5">
        <h3>Speelt nu af</h3>
        {playlist.length == 0 ? <p>Playlist is leeg</p> : null}
        <Command>
            <CommandList >
                <CommandGroup>
                    {
                        playlist.map((item) => <CommandItem>
                            <FileVideo className="mr-2 h-4 w-4" />
                            <span>{item}</span>
                        </CommandItem>)
                    }
                </CommandGroup>
            </CommandList>
        </Command>
        <Button onClick={updatePlaylist}>Refresh</Button>
    </div>
}
    