// The Broadcast chain (GDD §4.8): twelve Field Manual pages from vector to singular value decomposition.
// `needs` is the honest dependency order (many chains respect it); `because` holds Ilse's model sentence for
// each link the player might make, used only by Help me start. Used by the Epilogue's broadcast beat.
import type { BroadcastDef } from '../game/types';

export const BROADCAST: BroadcastDef = {
  id: 'broadcast',
  pages: [
    { id: 'vector', term: 'Vector', chapter: 'c01', needs: [] },
    {
      id: 'span', term: 'Linear combination and span', chapter: 'c02', needs: ['vector'],
      because: { vector: 'a combination is made by scaling arrows and adding them tip to tail.' },
    },
    {
      id: 'independence', term: 'Independence and basis', chapter: 'c03', needs: ['span'],
      because: { span: 'an arrow is wasted exactly when it is already in the span of the others.' },
    },
    {
      id: 'dot', term: 'Dot product', chapter: 'c04', needs: ['vector'],
      because: { vector: 'it multiplies matching parts of two arrows and adds them up.', span: 'it measures how much one arrow points along another.', independence: 'it measures how much one arrow points along another.' },
    },
    {
      id: 'matrix', term: 'A matrix is a move', chapter: 'c11', needs: ['span'],
      because: { span: 'a matrix times x is the combination of its columns with the numbers in x.', dot: 'each entry of A x is the dot product of a row with x.', independence: 'the columns say where the basis arrows land.' },
    },
    {
      id: 'solving', term: 'Solving a system', chapter: 'c10', needs: ['matrix'],
      because: { matrix: 'solving A x = b asks which input the move sends to b.', span: 'b can be reached exactly when it is in the span of the columns.' },
    },
    {
      id: 'inverse', term: 'Inverse', chapter: 'c13', needs: ['matrix', 'solving'],
      because: { solving: 'the inverse is what you get by solving A x = b for every b at once.', matrix: 'the inverse is the move that undoes the move.' },
    },
    {
      id: 'determinant', term: 'Determinant', chapter: 'c14', needs: ['matrix'],
      because: { matrix: 'it is the factor by which the move scales every area or volume.', inverse: 'a move has an inverse exactly when it does not flatten volume to zero.', solving: 'the pivots multiply to it, up to sign.' },
    },
    {
      id: 'rank', term: 'Null space and rank', chapter: 'c16', needs: ['solving', 'independence'],
      because: { solving: 'the free columns of the reduced form give the directions that land on zero.', determinant: 'a zero determinant means some direction was flattened, so the rank drops.', inverse: 'a move with a non-zero null space cannot be undone.', independence: 'the rank counts the independent columns.' },
    },
    {
      id: 'eigen', term: 'Eigenvectors', chapter: 'c18', needs: ['matrix', 'determinant'],
      because: { determinant: 'λ is an eigenvalue exactly when det(A − λI) = 0.', rank: 'λ is an eigenvalue exactly when A − λI has a non-zero null space.', matrix: 'they are the directions the move does not turn.' },
    },
    {
      id: 'lsq', term: 'Projection and least squares', chapter: 'c23', needs: ['dot', 'solving'],
      because: { dot: 'the best fit leaves an error at right angles to every column, and the dot product tests right angles.', solving: 'when A x = b has no solution, we solve the nearest system that has one.', rank: 'b is outside the column space, so we drop it onto it.', eigen: 'it also needs right angles, which the dot product measures.' },
    },
    {
      id: 'svd', term: 'Singular value decomposition', chapter: 'c25', needs: ['eigen', 'lsq'],
      because: { eigen: 'the right singular vectors are the eigenvectors of AᵀA.', lsq: 'keeping the largest singular values gives the closest low-rank matrix.', determinant: 'the product of the singular values is the size of the determinant.' },
    },
  ],
  down: ['svd', 'sym_eigen', 'power_iteration', 'matvec', 'lincomb', 'scale', 'add'],
};
