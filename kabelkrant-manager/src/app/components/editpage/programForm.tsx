import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { FileVideo, Trash2 } from "lucide-react"
import { FormItem } from "../formItem"
import { FormField } from "../ui/form"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Checkbox } from "../ui/checkbox"
import { TimesEditor } from "./timesEditor"
import { ProgrammaFormSchema, schema } from "../../type/programFormName"
import { days } from "../../type/days"
import { useEffect, useState } from "react"
import { FilesWithMetadata, VideoFile } from "src/global/types/FileMetaTypes"
import { Command, CommandGroup, CommandItem, CommandList } from "../ui/command"
import { formatDuration } from "../../function/formatDuration"
import { sortFilesWithNumbers } from  "../../../global/sortFunction"
import { ConfirmDialog } from "../ConfirmDialog/ConfirmDialog"

export interface ProgramFormProps {
    value: ProgrammaFormSchema
    onSubmit: (data: ProgrammaFormSchema) => void
}

export const ProgramForm: React.FC<ProgramFormProps> = ({ value, onSubmit }) => {
    const { register, handleSubmit, control, setValue, watch, reset } = useForm<ProgrammaFormSchema>({
        resolver:  zodResolver(schema),
        defaultValues: value
    })
    const [filesWithMetadata, setFilesWithMetadata] = useState<FilesWithMetadata[]>([])

    useEffect(() => {
        setTimeout(() => {
            reset(value)
        }, 1)
    }, [value])

    async function getFiles() {
        const files = await window.electronApi.getFilesInFolder(watch().path)
        setFilesWithMetadata(files.sort((a,b) => sortFilesWithNumbers(a.name, b.name)))
    }

    useEffect(() => {
        if (!watch().path) return
        getFiles()
    }, [watch().path])

    const { fields, append, remove } = useFieldArray({
        name: "planning",
        control,
    })

    function save() {
        handleSubmit(onSubmit)()
    }

    const width = 130

    async function selectFolder() {
        setValue("path", await window.electronApi.selectFolder())
    }

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <FormItem labelWidth={width} label="Programma titel">
                    <Input {...register("programName")} />
                </FormItem>
                <FormItem labelWidth={width} label="Map">
                    <Input {...register("path")} readOnly />
                    <Button style={{ width: "fit-content" }} color="primary" className="" onClick={selectFolder}>Map kiezen</Button>
                </FormItem>
                <FormItem labelWidth={width} label="Speel als blok">
                    <Controller name="playAll" control={control} render={({field}) =>
                        <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />
                    }/>
                </FormItem>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>
                        Uitzendingen
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    {
                        fields.length === 0 && <div className="text-center">Geen uitzendingen</div>
                    }
                    {
                        fields.length > 0 && fields.map((field, index) => {
                            return (
                                <Card key={field.id} className="p-4">
                                    <div key={field.id} className="flex flex-col gap-2">
                                        {/*<FormItem labelWidth={width} label={"Datum"}>
                                            <DatePicker date={watch(`planning.${index}.start`)} setDate={(date) => {
                                                console.log(date)
                                                setValue(`planning.${index}.start`, date ?? new Date())
                                            }} />
                                        </FormItem>
                                        <FormItem labelWidth={width} label="Einde">
                                            <Input {...register(`planning.${index}.end` as const)} />
                                        </FormItem>*/}
                                        <FormItem labelWidth={width} label="Dagen">
                                            <FormField control={control} name={`planning.${index}.days`} render={
                                                ({ field }) => (
                                                    <div className="flex flex-row gap-2">
                                                        {days.map((day) => {
                                                            return (
                                                                <div key={day.name} className="flex items-center gap-2">
                                                                    <Checkbox checked={field?.value?.includes(day?.value)} onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            field.onChange([...field.value, day.value])
                                                                            return
                                                                        }
                                                                        field.onChange(field.value.filter((v: number) => v !== day.value))
                                                                    }} />
                                                                    <div>{day.name}</div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            } />
                                        </FormItem>
                                        <FormItem labelWidth={width} label="Tijden">
                                            <TimesEditor index={index} control={control} />
                                        </FormItem>
                                        <Button style={{ width: 45, height: 45 }} onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </Card>
                            )
                        })
                    }
                </CardContent>
                <CardFooter>
                    <Button onClick={() => append({
                        days: [],
                        times: ["00:00:00"]
                    })} >+</Button>
                </CardFooter>
            </Card>
            <Button onClick={save}>Save</Button>
            <CardTitle>Video's</CardTitle>
            <Command>
                <CommandList >
                    <CommandGroup>
                        {
                            filesWithMetadata.map((file) => {
                                if(file.type == "video"){
                                    return (
                                        <CommandItem key={file.name}>
                                            <FileVideo className="mr-2 h-4 w-4" />
                                            <span>{file.name}</span> - 
                                            <span>{file.type} - { formatDuration(((file as VideoFile).duration ?? 0) * 1000) }</span>

                                        </CommandItem>
                                    )
                                }
                                return (
                                    <CommandItem key={file.name}>
                                            <FileVideo className="mr-2 h-4 w-4" />
                                            <span>{file.name}</span>
                                        </CommandItem>
                                )
                                
                            })
                        }
                    </CommandGroup>
                </CommandList>
            </Command>
            <ConfirmDialog buttonText="Nu afspelen op TV" onConfirm={() => window.electronApi.playVideoItem(value)} />
        </div>
    )
}