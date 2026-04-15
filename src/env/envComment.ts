import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface EnvComment {
  environment: string;
  key: string;
  comment: string;
  updatedAt: string;
}

export interface CommentMap {
  [environment: string]: {
    [key: string]: string;
  };
}

export function getCommentFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'comments.json');
}

export function loadComments(): CommentMap {
  const filePath = getCommentFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveComments(comments: CommentMap): void {
  const filePath = getCommentFilePath();
  fs.writeFileSync(filePath, JSON.stringify(comments, null, 2), 'utf-8');
}

export function setComment(environment: string, key: string, comment: string): void {
  const comments = loadComments();
  if (!comments[environment]) comments[environment] = {};
  comments[environment][key] = comment;
  saveComments(comments);
}

export function removeComment(environment: string, key: string): boolean {
  const comments = loadComments();
  if (!comments[environment] || !comments[environment][key]) return false;
  delete comments[environment][key];
  if (Object.keys(comments[environment]).length === 0) delete comments[environment];
  saveComments(comments);
  return true;
}

export function getComment(environment: string, key: string): string | undefined {
  const comments = loadComments();
  return comments[environment]?.[key];
}

export function getCommentsForEnvironment(environment: string): Record<string, string> {
  const comments = loadComments();
  return comments[environment] ?? {};
}

export function clearCommentsForEnvironment(environment: string): void {
  const comments = loadComments();
  delete comments[environment];
  saveComments(comments);
}
