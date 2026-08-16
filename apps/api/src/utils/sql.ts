export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export function paginationOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}
