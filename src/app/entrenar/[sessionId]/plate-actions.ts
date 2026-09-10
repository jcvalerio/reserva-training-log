import type { SetLoadingModelActionState, SetPlateBuildActionState } from "../actions";

/**
 * The two setup actions as the plate panel sees them.
 *
 * Their own module so `plate-panel.tsx` and `session-runner.tsx` describe them
 * identically — the runner receives them as props from a server component and
 * passes them straight down, and two hand-written copies of a `useActionState`
 * signature are two things to keep in step.
 */
export type SetLoadingModelAction = (
  prevState: SetLoadingModelActionState,
  formData: FormData,
) => Promise<SetLoadingModelActionState>;

export type SetPlateBuildAction = (
  prevState: SetPlateBuildActionState,
  formData: FormData,
) => Promise<SetPlateBuildActionState>;
