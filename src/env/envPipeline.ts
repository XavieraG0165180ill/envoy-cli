import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface PipelineStep {
  name: string;
  command: string;
  args?: string[];
}

export interface Pipeline {
  id: string;
  environment: string;
  steps: PipelineStep[];
  createdAt: string;
  updatedAt: string;
}

export function getPipelineFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'pipelines.json');
}

export function loadPipelines(): Pipeline[] {
  const filePath = getPipelineFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

export function savePipelines(pipelines: Pipeline[]): void {
  const filePath = getPipelineFilePath();
  fs.writeFileSync(filePath, JSON.stringify(pipelines, null, 2), 'utf-8');
}

export function addPipeline(environment: string, steps: PipelineStep[]): Pipeline {
  const pipelines = loadPipelines();
  const id = `${environment}-${Date.now()}`;
  const now = new Date().toISOString();
  const pipeline: Pipeline = { id, environment, steps, createdAt: now, updatedAt: now };
  pipelines.push(pipeline);
  savePipelines(pipelines);
  return pipeline;
}

export function removePipeline(id: string): boolean {
  const pipelines = loadPipelines();
  const index = pipelines.findIndex(p => p.id === id);
  if (index === -1) return false;
  pipelines.splice(index, 1);
  savePipelines(pipelines);
  return true;
}

export function getPipelinesForEnvironment(environment: string): Pipeline[] {
  return loadPipelines().filter(p => p.environment === environment);
}

export function updatePipeline(id: string, steps: PipelineStep[]): Pipeline | null {
  const pipelines = loadPipelines();
  const pipeline = pipelines.find(p => p.id === id);
  if (!pipeline) return null;
  pipeline.steps = steps;
  pipeline.updatedAt = new Date().toISOString();
  savePipelines(pipelines);
  return pipeline;
}
