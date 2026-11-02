import { createTheme, MantineColorsTuple } from '@mantine/core';

const bpmn: MantineColorsTuple = [
  '#eef4ff', '#d9e6ff', '#b3ccff', '#8bb1ff', '#6a9bff',
  '#4d90ff', '#3061c4', '#264f9f', '#1d3e7c', '#142c59',
];

export const theme = createTheme({
  primaryColor: 'bpmn',
  colors: { bpmn },
  primaryShade: 6,
  defaultRadius: 2,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSizes: { xs: '12px', sm: '13px', md: '14px', lg: '16px', xl: '18px' },
  cursorType: 'pointer',
});
