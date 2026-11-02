import { asTRBL, getMid } from 'diagram-js/lib/layout/LayoutUtil';
import { findFreePosition, generateGetNextPosition, getConnectedDistance } from 'diagram-js/lib/features/auto-place/AutoPlaceUtil';

export default class CustomAutoPlace {
  static $inject = ['eventBus'];

  constructor(eventBus: any) {
    eventBus.on('autoPlace', 1000, (e: any) => this.getPosition(e.source, e.shape));
  }

  getPosition(source: any, shape: any) {
    const trbl = asTRBL(source);
    const mid = getMid(source);

    if (shape.type === 'workflow:textAnnotation') {
      const position = { x: trbl.right + shape.width / 2, y: trbl.top - 50 - shape.height / 2 };
      return findFreePosition(source, shape, position, generateGetNextPosition({ y: { margin: -30, minDistance: 20 } }));
    }

    const distance = getConnectedDistance(source, {
      filter: (c: any) => c.type === 'workflow:sequenceFlow',
      defaultDistance: 50,
    });
    const position = { x: trbl.right + distance + shape.width / 2, y: mid.y };
    return findFreePosition(source, shape, position, generateGetNextPosition({ y: { margin: 30, minDistance: 80 } }));
  }
}
