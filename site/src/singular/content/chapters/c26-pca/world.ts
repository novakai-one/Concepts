// A kit PointCloud placed straight in the world and cleaned with it: cinematics and Briefing pictures have no
// puzzle context, and the kit's PointCloud only asks its host to add it.
import type { Object3D } from 'three';
import type { Game, PuzzleCtx } from '../../../game/types';
import { PointCloud, type PointCloudOpts } from '../../../kit/data';
import { inWorld } from '../c24-spectral/act9';

export function worldCloud(g: Game, o: PointCloudOpts, parent?: Object3D): PointCloud {
  const host = { add: () => undefined } as unknown as PuzzleCtx;
  return inWorld(g, new PointCloud(host, o), parent);
}
