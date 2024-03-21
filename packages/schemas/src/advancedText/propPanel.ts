import { propPanel as parentPropPanel } from '../text/propPanel';
import { PropPanel, PropPanelWidgetProps } from '@pdfme/common';
import { AdvancedTextSchema } from './types';

const mapDynamicVariables = (props: PropPanelWidgetProps) => {
  const { rootElement, changeSchemas, activeSchema } = props;

  const advancedTextSchema = (activeSchema as any);
  const content = advancedTextSchema.content || '';
  const variables = JSON.parse(advancedTextSchema.data) || {};

  const variablesChanged = updateVariablesFromText(content, variables);
  const varNames = Object.keys(variables);

  if (variablesChanged) {
    changeSchemas([
        { key: 'data', value: JSON.stringify(variables), schemaId: activeSchema.id },
        { key: 'variables', value: varNames, schemaId: activeSchema.id }
    ]);
  }

  const placeholderRowEl = document.getElementById('placeholder-dynamic-var')?.closest('.ant-form-item') as HTMLElement;
  if (!placeholderRowEl) {
    console.error('Failed to find Ant form placeholder row to create dynamic variables inputs.');
    return
  }
  placeholderRowEl.style.display = 'none';

  // The wrapping form element has a display:flex which limits the width of the form fields, removing.
  (rootElement.parentElement as HTMLElement).style.display = 'block';

  const title = document.createElement('span');
  title.innerHTML = 'Text Variables';
  rootElement.appendChild(title);

  if (varNames.length > 0) {
    for (let variableName of varNames) {
      const varRow = placeholderRowEl.cloneNode(true) as HTMLElement;

      const textarea = varRow.querySelector('textarea') as HTMLTextAreaElement;
      textarea.id = 'dynamic-var-' + variableName;
      textarea.value = variables[variableName];
      textarea.addEventListener('change', (e: Event) => {
        variables[variableName] = (e.target as HTMLTextAreaElement).value;
        changeSchemas([{ key: 'data', value: JSON.stringify(variables), schemaId: activeSchema.id }]);
      });

      const label = varRow.querySelector('label') as HTMLLabelElement
      label.innerText = variableName;

      varRow.style.display = 'block';
      rootElement.appendChild(varRow);
    }
  } else {
    const para = document.createElement('p');
    para.innerHTML = 'Add variables by typing words surrounded by curly brackets, e.g. <code style="color:#168fe3; font-weight:bold;">{name}</code>';
    rootElement.appendChild(para);
  }
};

export const propPanel: PropPanel<AdvancedTextSchema> = {
  schema: (propPanelProps: Omit<PropPanelWidgetProps, 'rootElement'>) => {
    if (typeof parentPropPanel.schema !== 'function') {
      throw Error('Oops, is text schema no longer a function?');
    }
    return {
      ...parentPropPanel.schema(propPanelProps),
      '-------': { type: 'void', widget: 'Divider' },
      dynamicVariables: { type: 'object', widget: 'mapDynamicVariables', bind: false, span: 24 },
      placeholderDynamicVar: {
        title: 'Placeholder Dynamic Variable',
        type: 'string',
        format: 'textarea',
        props: {
          id: 'placeholder-dynamic-var',
          autoSize: {
            minRows: 2,
            maxRows: 5,
          },
        },
        span: 24,
      },
    };
  },
  widgets: { ...parentPropPanel.widgets, mapDynamicVariables },
  defaultValue: '{}',
  defaultSchema: {
    ...parentPropPanel.defaultSchema,
    type: 'advancedText',
    content: 'Type something...',
    variables: [],
  },
};


const updateVariablesFromText = (text: string, variables: any): boolean => {
  const regex = /\{([^{}]+)}/g;
  const matches = text.match(regex);
  let changed = false;

  if (matches) {
    // Add any new variables
    for (const match of matches) {
      const variableName = match.replace('{', '').replace('}', '');
      if (!variables[variableName]) {
        // NOTE: We upper case the variable name as the default value
        variables[variableName] = variableName.toUpperCase();
        changed = true;
      }
    }
    // Remove any that no longer exist
    Object.keys(variables).forEach((variableName) => {
      if (!matches.includes('{' + variableName + '}')) {
        delete variables[variableName];
        changed = true;
      }
    });
  } else {
    // No matches at all, so clear all variables
    Object.keys(variables).forEach((variableName) => {
      delete variables[variableName];
      changed = true;
    });
  }

  return changed;
}