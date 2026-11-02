
export default class ValidationFeedback {
  static $inject = ['eventBus', 'customRules'];

  constructor(eventBus: any, rules: any) {
    eventBus.on('drag.init', () => { rules.lastReason = null; });

    const ends = ['create.end', 'shape.move.end', 'resize.end', 'connect.end', 'bendpoint.move.end', 'global-connect.end'];
    eventBus.on(ends, 1500, (e: any) => {
      const ctx = e.context || {};
      const failed = 'canExecute' in ctx ? !ctx.canExecute : 'allowed' in ctx ? !ctx.allowed : false;
      if (failed && rules.lastReason) {
        eventBus.fire('workflow.feedback', { level: 'error', message: rules.lastReason });
      }
      rules.lastReason = null;
    });
  }
}
