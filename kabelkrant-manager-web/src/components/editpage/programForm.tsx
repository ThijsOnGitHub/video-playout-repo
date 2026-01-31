import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Undo2, Redo2, Save, Check, CalendarClock, Globe, Video, AlertCircle, X } from "lucide-react";
import { FormItem } from "@/components/formItem";
import { FormField } from "@/components/ui/form";
import { FolderPicker } from "@/components/FolderPicker/FolderPicker";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TimesEditor } from "./timesEditor";
import { ScheduledDatesEditor } from "./ScheduledDatesEditor";
import { type ProgramFormSchema, programSchema } from "@/lib/schemas/program";
import { days } from "@/lib/types/days";
import { useEffect, useState, useCallback, useRef } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog/ConfirmDialog";
import { playVideoItem } from "@/server/functions/obs";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { VideoManager } from "./VideoManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StreamSelector } from "./StreamSelector";
import { useProgramsContext } from "@/contexts/ProgramsContext";

export interface ProgramFormProps {
  value: ProgramFormSchema;
  onSubmit: (data: ProgramFormSchema) => void;
}

const AUTOSAVE_DELAY = 1000; // 1 second delay for autosave

export const ProgramForm: React.FC<ProgramFormProps> = ({ value, onSubmit }) => {
  const { saveError, clearSaveError } = useProgramsContext();
  const { register, control, watch, reset, setValue } = useForm<ProgramFormSchema>({
    resolver: zodResolver(programSchema),
    defaultValues: value,
  });

  const currentPath = watch("path");
  const programType = watch("programType") || "video";

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInternalUpdateRef = useRef(false);
  const lastFormValueRef = useRef<string>(JSON.stringify(value));
  const pendingDataRef = useRef<ProgramFormSchema | null>(null);
  const onSubmitRef = useRef(onSubmit);

  // Keep onSubmit ref updated to avoid stale closure
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  // Undo/Redo history
  const { setValue: addToHistory, undo, redo, canUndo, canRedo } = useUndoRedo<ProgramFormSchema>(value, { debounceMs: 300, maxHistorySize: 50 });

  const triggerAutosave = useCallback((data: ProgramFormSchema) => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    pendingDataRef.current = data;
    setSaveStatus("saving");
    autosaveTimerRef.current = setTimeout(() => {
      const dataToSave = pendingDataRef.current;
      if (dataToSave) {
        onSubmitRef.current(dataToSave);
        pendingDataRef.current = null;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, AUTOSAVE_DELAY);
  }, []);

  const applyHistoryValue = useCallback((newValue: ProgramFormSchema | undefined) => {
    if (newValue && newValue.id === value.id) {
      isInternalUpdateRef.current = true;
      lastFormValueRef.current = JSON.stringify(newValue);
      reset(newValue);
      triggerAutosave(newValue);
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 50);
    }
  }, [value.id, reset, triggerAutosave]);

  const handleUndo = useCallback(() => {
    applyHistoryValue(undo());
  }, [undo, applyHistoryValue]);

  const handleRedo = useCallback(() => {
    applyHistoryValue(redo());
  }, [redo, applyHistoryValue]);

  // Watch form changes and add to history + autosave
  useEffect(() => {
    const subscription = watch((formData) => {
      if (!formData || isInternalUpdateRef.current) return;
      const data = formData as ProgramFormSchema;
      const dataJson = JSON.stringify(data);
      if (dataJson !== lastFormValueRef.current) {
        lastFormValueRef.current = dataJson;
        addToHistory(data);
        triggerAutosave(data);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, addToHistory, triggerAutosave]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? handleRedo() : handleUndo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  const { fields, append, remove } = useFieldArray({
    name: "planning",
    control,
  });

  const width = 130;

  async function handlePlayVideo() {
    try {
      await playVideoItem({ data: value });
    } catch (e) {
      console.error("Error playing video", e);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar with undo/redo and save status */}
      <div className="flex items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo} title="Ongedaan maken (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={!canRedo} title="Opnieuw (Ctrl+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saveStatus === "saving" && (
            <>
              <Save className="h-4 w-4 animate-pulse" />
              <span>Opslaan...</span>
            </>
          )}
          {saveStatus === "saved" && !saveError && (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Opgeslagen</span>
            </>
          )}
          {saveStatus === "idle" && !saveError && <span>Automatisch opslaan aan</span>}
        </div>
      </div>

      {/* Error message display */}
      {saveError && (
        <div className="flex items-center justify-between gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">Fout bij opslaan: {saveError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearSaveError} className="h-6 w-6 p-0 hover:bg-red-100">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <FormItem labelWidth={width} label="Programma titel">
          <Input {...register("programName")} />
        </FormItem>
        <FormItem labelWidth={width} label="Type">
          <Controller
            name="programType"
            control={control}
            render={({ field }) => (
              <Select value={field.value || "video"} onValueChange={field.onChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video
                    </div>
                  </SelectItem>
                  <SelectItem value="iframe">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Iframe / Webpagina
                    </div>
                  </SelectItem>
                  <SelectItem value="raadsvergadering">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Raadsvergadering
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormItem>

        {/* Video-specifieke velden */}
        {programType === "video" && (
          <>
            <FormItem labelWidth={width} label="Map">
              <Controller name="path" control={control} render={({ field }) => <FolderPicker value={field.value} onChange={field.onChange} />} />
            </FormItem>
            <FormItem labelWidth={width} label="Speel als blok">
              <Controller name="playAll" control={control} render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />} />
            </FormItem>
          </>
        )}

        {/* Raadsvergadering-specifieke velden */}
        {programType === "raadsvergadering" && (
          <FormItem labelWidth={width} label="Webcast ID">
            <Input placeholder="abc5703d-b1f7-46d6-9ef9-4a224001f8e6" {...register("webcastId")} />
          </FormItem>
        )}

        {/* Iframe-specifieke velden */}
        {programType === "iframe" && (
          <>
            <FormItem labelWidth={width} label="Iframe URL">
              <Input placeholder="https://example.com" {...register("iframeUrl")} />
            </FormItem>
            <FormItem labelWidth={width} label="Geen eindtijd">
              <Controller
                name="iframeDurationSeconds"
                control={control}
                render={({ field }) => <Checkbox checked={field.value === null} onCheckedChange={(checked) => field.onChange(checked ? null : 60)} />}
              />
            </FormItem>
            {watch("iframeDurationSeconds") !== null && (
              <FormItem labelWidth={width} label="Duur (sec)">
                <Input type="number" min={1} placeholder="60" {...register("iframeDurationSeconds", { valueAsNumber: true })} />
              </FormItem>
            )}
            <FormItem labelWidth={width} label="Audio muten">
              <Controller name="iframeMuted" control={control} render={({ field }) => <Checkbox checked={field.value ?? true} onCheckedChange={(checked) => field.onChange(checked)} />} />
            </FormItem>
          </>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Uitzendingen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {fields.length === 0 && <div className="text-center">Geen uitzendingen</div>}
          {fields.length > 0 &&
            fields.map((field, index) => {
              return (
                <Card key={field.id} className="p-4">
                  <div className="flex flex-col gap-2">
                    <FormItem labelWidth={width} label="Dagen">
                      <FormField
                        control={control}
                        name={`planning.${index}.days`}
                        render={({ field }) => (
                          <div className="flex flex-row gap-2">
                            {days.map((day) => {
                              return (
                                <div key={day.name} className="flex items-center gap-2">
                                  <Checkbox
                                    checked={field?.value?.includes(day?.value)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...field.value, day.value]);
                                        return;
                                      }
                                      field.onChange(field.value.filter((v: number) => v !== day.value));
                                    }}
                                  />
                                  <div>{day.name}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      />
                    </FormItem>
                    <FormItem labelWidth={width} label="Tijden">
                      <TimesEditor index={index} control={control} />
                    </FormItem>
                    <Button style={{ width: 45, height: 45 }} onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
        </CardContent>
        <CardFooter>
          <Button
            onClick={() =>
              append({
                days: [],
                times: ["00:00:00"],
              })
            }
          >
            +
          </Button>
        </CardFooter>
      </Card>

      {/* Specifieke datum/tijd planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Specifieke Uitzendingen
          </CardTitle>
          <CardDescription>
            {programType === "video"
              ? "Plan video's in op een specifieke datum en tijd (naast de wekelijkse planning)"
              : "Plan deze iframe in op een specifieke datum en tijd (naast de wekelijkse planning)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduledDatesEditor control={control} />
        </CardContent>
      </Card>

      {/* Stream Selector - alleen voor raadsvergadering type */}
      {programType === "raadsvergadering" && (
        <StreamSelector
          currentWebcastId={watch("webcastId")}
          onStreamSelect={(stream) => {
            // Prevent triggering watch/autosave multiple times
            isInternalUpdateRef.current = true;

            // Set webcast information and program name
            setValue("programName", stream.title, { shouldValidate: false });
            setValue("webcastId", stream.webcastId, { shouldValidate: false });
            setValue("webcastCode", stream.webcastCode, { shouldValidate: false });

            // Add scheduled date for this stream
            const currentScheduledDates = watch("scheduledDates") || [];

            // Check if there's already a scheduled date for this stream
            const existingIndex = currentScheduledDates.findIndex((sd) => sd.note === `Raadsvergadering: ${stream.title}`);

            if (existingIndex >= 0) {
              // Update existing scheduled date
              const updatedDates = [...currentScheduledDates];
              updatedDates[existingIndex] = {
                ...updatedDates[existingIndex],
                dateTime: stream.scheduledStart,
              };
              setValue("scheduledDates", updatedDates, { shouldValidate: false });
            } else {
              // Add new scheduled date
              setValue(
                "scheduledDates",
                [
                  ...currentScheduledDates,
                  {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    dateTime: stream.scheduledStart,
                    note: `Raadsvergadering: ${stream.title}`,
                  },
                ],
                { shouldValidate: false }
              );
            }

            // Re-enable watch after a short delay and trigger single autosave
            setTimeout(() => {
              isInternalUpdateRef.current = false;
              // Manually trigger one autosave with all the changes
              const formData = watch();
              triggerAutosave(formData as ProgramFormSchema);
            }, 50);
          }}
        />
      )}

      {/* Video Manager Component - alleen voor video type */}
      {programType === "video" && <VideoManager folderPath={currentPath} />}

      <ConfirmDialog buttonText="Nu afspelen op TV" onConfirm={handlePlayVideo} />
    </div>
  );
};
