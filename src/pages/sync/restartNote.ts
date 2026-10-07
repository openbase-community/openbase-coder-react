/** Appended when the change takes effect only after Openbase restarts (Docker). */
export const RESTART_NOTE = " Restart Openbase to finish.";

export const withRestartNote = async (
  res: Response,
  message: string,
): Promise<string> => {
  try {
    const payload = (await res.clone().json()) as {
      restart_required?: boolean;
    };
    return payload?.restart_required ? message + RESTART_NOTE : message;
  } catch {
    return message;
  }
};
