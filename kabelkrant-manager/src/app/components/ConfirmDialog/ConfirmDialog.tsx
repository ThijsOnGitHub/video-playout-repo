import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DialogClose } from "@radix-ui/react-dialog";

export interface ConfirmDialogProps {
   buttonText: string;
   onConfirm: () => void;
}
 
export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button >{props.buttonText}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Video Afspelen</DialogTitle>
          <DialogDescription>
            Wil je dit programma nu live op de TV afspelen?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" onClick={props.onConfirm}>Ja</Button>
            </DialogClose>
            <DialogClose asChild>
                <Button>Nee</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}