import CommandModule from 'diagram-js/lib/command';
import ModelingModule from 'diagram-js/lib/features/modeling';
import SelectionModule from 'diagram-js/lib/features/selection';
import RulesModule from 'diagram-js/lib/features/rules';
import DraggingModule from 'diagram-js/lib/features/dragging';
import ConnectModule from 'diagram-js/lib/features/connect';
import CreateModule from 'diagram-js/lib/features/create';
import MoveModule from 'diagram-js/lib/features/move';
import ResizeModule from 'diagram-js/lib/features/resize';
import PaletteModule from 'diagram-js/lib/features/palette';
import ContextPadModule from 'diagram-js/lib/features/context-pad';
import PopupMenuModule from 'diagram-js/lib/features/popup-menu';
import BendpointsModule from 'diagram-js/lib/features/bendpoints';
import SnappingModule from 'diagram-js/lib/features/snapping';
import ConnectionPreviewModule from 'diagram-js/lib/features/connection-preview';
import KeyboardModule from 'diagram-js/lib/features/keyboard';
import KeyboardMoveSelectionModule from 'diagram-js/lib/features/keyboard-move-selection';
import LassoToolModule from 'diagram-js/lib/features/lasso-tool';
import SpaceToolModule from 'diagram-js/lib/features/space-tool';
import HandToolModule from 'diagram-js/lib/features/hand-tool';
import AlignElementsModule from 'diagram-js/lib/features/align-elements';
import DistributeElementsModule from 'diagram-js/lib/features/distribute-elements';
import InteractionEventsModule from 'diagram-js/lib/features/interaction-events';
import OutlineModule from 'diagram-js/lib/features/outline';
import EditorActionsModule from 'diagram-js/lib/features/editor-actions';
import ZoomScrollModule from 'diagram-js/lib/navigation/zoomscroll';
import MoveCanvasModule from 'diagram-js/lib/navigation/movecanvas';
import DirectEditingModule from 'diagram-js-direct-editing';
import CroppingConnectionDocking from 'diagram-js/lib/layout/CroppingConnectionDocking';
import CustomLayouter from './routing/CustomLayouter';
import ConnectionRoutingBehavior from './routing/ConnectionRoutingBehavior';
import ReconnectOnDeleteBehavior from './routing/ReconnectOnDeleteBehavior';
import AutoResizeModule from 'diagram-js/lib/features/auto-resize';
import OverlaysModule from 'diagram-js/lib/features/overlays';
import SubProcessView from './subprocess/SubProcessView';
import DrillTargetBehavior from './subprocess/DrillTargetBehavior';
import AutoPlaceModule from 'diagram-js/lib/features/auto-place';
import CustomAutoPlace from './CustomAutoPlace';
import LabelSupportModule from 'diagram-js/lib/features/label-support';
import LabelBehavior from './labels/LabelBehavior';
import PoolBehavior from './pool/PoolBehavior';
import ValidationFeedback from './pool/ValidationFeedback';
import CustomElementFactory from './CustomElementFactory';
import CustomModeling from './CustomModeling';
import CustomRenderer from './CustomRenderer';
import CustomRules from './CustomRules';
import CustomPaletteProvider from './CustomPaletteProvider';
import CustomContextPadProvider from './CustomContextPadProvider';
import CustomPopupMenuProvider from './CustomPopupMenuProvider';
import CustomDirectEditingProvider from './CustomDirectEditingProvider';

export const CoreModule = {
  __depends__: [
    CommandModule,
    SelectionModule,
    RulesModule,
    ModelingModule,
    DraggingModule,
    ConnectModule,
    CreateModule,
    MoveModule,
    ResizeModule,
    PaletteModule,
    ContextPadModule,
    PopupMenuModule,
    BendpointsModule,
    SnappingModule,
    ConnectionPreviewModule,
    KeyboardModule,
    KeyboardMoveSelectionModule,
    LassoToolModule,
    SpaceToolModule,
    HandToolModule,
    AlignElementsModule,
    DistributeElementsModule,
    InteractionEventsModule,
    OutlineModule,
    EditorActionsModule,
    ZoomScrollModule,
    MoveCanvasModule,
    DirectEditingModule,
    AutoResizeModule,
    AutoPlaceModule,
    LabelSupportModule,
    OverlaysModule,
  ],
};

export const WorkflowModule = {
  __depends__: [CoreModule],
  __init__: [
    'customRenderer',
    'customRules',
    'connectionRoutingBehavior',
    'reconnectOnDeleteBehavior',
    'subProcessView',
    'drillTargetBehavior',
    'poolBehavior',
    'customAutoPlace',
    'labelBehavior',
    'validationFeedback',
    'workflowPaletteProvider',
    'workflowContextPadProvider',
    'workflowPopupMenuProvider',
    'workflowDirectEditingProvider',
  ],

  elementFactory: ['type', CustomElementFactory],
  modeling: ['type', CustomModeling],
  layouter: ['type', CustomLayouter],
  connectionDocking: ['type', CroppingConnectionDocking],
  connectionRoutingBehavior: ['type', ConnectionRoutingBehavior],
  reconnectOnDeleteBehavior: ['type', ReconnectOnDeleteBehavior],
  subProcessView: ['type', SubProcessView],
  drillTargetBehavior: ['type', DrillTargetBehavior],
  poolBehavior: ['type', PoolBehavior],
  customAutoPlace: ['type', CustomAutoPlace],
  labelBehavior: ['type', LabelBehavior],
  validationFeedback: ['type', ValidationFeedback],
  customRenderer: ['type', CustomRenderer],
  customRules: ['type', CustomRules],
  workflowPaletteProvider: ['type', CustomPaletteProvider],
  workflowContextPadProvider: ['type', CustomContextPadProvider],
  workflowPopupMenuProvider: ['type', CustomPopupMenuProvider],
  workflowDirectEditingProvider: ['type', CustomDirectEditingProvider],
};
