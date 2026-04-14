export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export const ok = <T>(data?: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message
});

export const fail = (error: string, message?: string): ApiResponse => ({
  success: false,
  error,
  message
});
