import { z } from 'zod';

export const toolInputSchemas: Record<string, z.ZodTypeAny> = {
  read_file: z.object({ path: z.string().min(1) }),
  write_file: z.object({ path: z.string().min(1), content: z.string() }),
  list_files: z.object({ directory: z.string().optional(), details: z.boolean().optional() }),
  create_folder: z.object({ path: z.string().min(1) }),
  delete_file: z.object({ path: z.string().min(1) }),
  delete_folder: z.object({ path: z.string().min(1), recursive: z.boolean().optional() }),
  file_info: z.object({ path: z.string().min(1) }),
  search_content: z.object({
    pattern: z.string().min(1),
    directory: z.string().optional(),
    filePattern: z.string().optional(),
    maxResults: z.number().int().positive().optional(),
  }),
  replace_in_file: z.object({ path: z.string().min(1), old_str: z.string(), new_str: z.string() }),
  append_file: z.object({ path: z.string().min(1), content: z.string() }),
  copy_file: z.object({ source: z.string().min(1), destination: z.string().min(1) }),
  move_file: z.object({ source: z.string().min(1), destination: z.string().min(1) }),
  run_command: z.object({ command: z.string().min(1), timeout: z.number().int().positive().optional() }),
};

const toolOutputSchemas: Record<string, z.ZodTypeAny> = {
  read_file: z.string(),
  write_file: z.string(),
  list_files: z.string(),
  create_folder: z.string(),
  delete_file: z.string(),
  delete_folder: z.string(),
  file_info: z.string(),
  search_content: z.string(),
  replace_in_file: z.string(),
  append_file: z.string(),
  copy_file: z.string(),
  move_file: z.string(),
  run_command: z.string(),
};

export function validateToolInput(toolName: string, args: unknown): unknown {
  const schema = toolInputSchemas[toolName];
  if (!schema) return args;
  return schema.parse(args);
}

export function validateToolOutput(toolName: string, output: unknown): unknown {
  const schema = toolOutputSchemas[toolName];
  if (!schema) return output;
  return schema.parse(output);
}

export function isToolCall(obj: unknown): obj is { id: string; type: 'function'; function: { name: string; arguments: string } } {
  if (!obj || typeof obj !== 'object') return false;
  const x = obj as any;
  return (
    typeof x.id === 'string' &&
    x.type === 'function' &&
    x.function &&
    typeof x.function.name === 'string' &&
    typeof x.function.arguments === 'string'
  );
}

export function isToolCallArray(obj: unknown): obj is { id: string; type: 'function'; function: { name: string; arguments: string } }[] {
  return Array.isArray(obj) && obj.every(isToolCall);
}
