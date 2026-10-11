import { startTransition, type FormEvent } from "react";

/**
 * `onSubmit` for forms backed by a server action. React resets a `<form action={…}>` after every
 * submission, so when the server answers "fix this field" everything the person typed was gone.
 * Submitting this way keeps the fields as typed; forms that should empty themselves after success
 * still call `form.reset()` when the action reports `ok`.
 */
export function keepValuesOnSubmit(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Include the clicked button's name/value, as a normal submission would.
    const submitter = (e.nativeEvent as SubmitEvent).submitter ?? undefined;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
