import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Undo2, Redo2, Save, Check, CalendarClock } from "lucide-react";
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

export interface ProgramFormProps {
  value: ProgramFormSchema;
  onSubmit: (data: ProgramFormSchema) => void;
}

const AUTOSAVE_DELAY = 1000; // 1 second delay for autosave

export const ProgramForm: React.FC<ProgramFormProps> = ({ value, onSubmit }) => {
  const { register, control, watch, reset } = useForm<ProgramFormSchema>({
    resolver: zodResolver(programSchema),
    defaultValues: value,
  });

  const currentPath = watch("path");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInternalUpdateRef = useRef(false);
  const lastFormValueRef = useRef<string>(JSON.stringify(value));

  // Undo/Redo history
  const { value: historyValue, setValue: addToHistory, undo, redo, canUndo, canRedo, reset: resetHistory } = useUndoRedo<ProgramFormSchema>(value, { debounceMs: 300, maxHistorySize: 50 });

  // Track the current program ID to detect when switching programs
  const currentProgramIdRef = useRef<string>(value.id);

  // Reset form and history only when switching to a DIFFERENT program
  useEffect(() => {
    // Only reset if we switched to a different program
    if (value.id !== currentProgramIdRef.current) {
      currentProgramIdRef.current = value.id;
      isInternalUpdateRef.current = true;
      lastFormValueRef.current = JSON.stringify(value);
      setTimeout(() => {
        reset(value);
        resetHistory(value);
        // Allow watch to trigger again after a short delay
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 50);
      }, 1);
    }
  }, [value.id, reset, resetHistory]);

  // Apply history value to form when undo/redo happens
  useEffect(() => {
    if (historyValue && historyValue.id === value.id) {
      const historyJson = JSON.stringify(historyValue);
      // Only apply if different from current form value
      if (historyJson !== lastFormValueRef.current) {
        isInternalUpdateRef.current = true;
        lastFormValueRef.current = historyJson;
        reset(historyValue);
        // Trigger autosave after undo/redo
        triggerAutosave(historyValue);
        setTimeout(() => {
          isInternalUpdateRef.current = false;
        }, 50);
      }
    }
  }, [historyValue]);

  // Watch form changes and add to history + autosave
  useEffect(() => {
    const subscription = watch((formData) => {
      if (!formData || isInternalUpdateRef.current) {
        return;
      }
      const data = formData as ProgramFormSchema;
      const dataJson = JSON.stringify(data);

      // Only trigger if data actually changed from the last form value
      if (dataJson !== lastFormValueRef.current) {
        lastFormValueRef.current = dataJson;
        // Add to history
        addToHistory(data);
        // Trigger autosave
        triggerAutosave(data);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, addToHistory]);

  const triggerAutosave = useCallback(
    (data: ProgramFormSchema) => {
      // Clear existing timer
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      setSaveStatus("saving");

      // Set new timer for autosave
      autosaveTimerRef.current = setTimeout(() => {
        onSubmit(data);
        setSaveStatus("saved");
        // Reset status after a short delay
        setTimeout(() => setSaveStatus("idle"), 1500);
      }, AUTOSAVE_DELAY);
    },
    [onSubmit]
  );

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

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
          <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} title="Ongedaan maken (Ctrl+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} title="Opnieuw (Ctrl+Shift+Z)">
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
          {saveStatus === "saved" && (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Opgeslagen</span>
            </>
          )}
          {saveStatus === "idle" && <span>Automatisch opslaan aan</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <FormItem labelWidth={width} label="Programma titel">
          <Input {...register("programName")} />
        </FormItem>
        <FormItem labelWidth={width} label="Map">
          <Controller name="path" control={control} render={({ field }) => <FolderPicker value={field.value} onChange={field.onChange} />} />
        </FormItem>
        <FormItem labelWidth={width} label="Speel als blok">
          <Controller name="playAll" control={control} render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />} />
        </FormItem>
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
          <CardDescription>Plan video's in op een specifieke datum en tijd (naast de wekelijkse planning)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScheduledDatesEditor control={control} />
        </CardContent>
      </Card>

      {/* Video Manager Component */}
      <VideoManager folderPath={currentPath} />

      <ConfirmDialog buttonText="Nu afspelen op TV" onConfirm={handlePlayVideo} />
    </div>
  );
};
