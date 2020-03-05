// @flow
import * as React from 'react';
import Editor from 'components/Editor';
import ClickablePadding from 'components/ClickablePadding';
import plugins from './plugins';

type Props = {|
  defaultValue?: string,
  readOnly?: boolean,
|};

class DocumentEditor extends React.Component<Props> {
  editor: ?Editor;

  componentDidMount() {
    if (!this.props.defaultValue) {
      setImmediate(this.focusAtStart);
    }
  }

  focusAtStart = () => {
    if (this.editor) {
      this.editor.focusAtStart();
    }
  };

  focusAtEnd = () => {
    if (this.editor) {
      this.editor.focusAtEnd();
    }
  };

  render() {
    const { readOnly } = this.props;

    return (
      <React.Fragment>
        <Editor
          ref={ref => (this.editor = ref)}
          autoFocus={!this.props.defaultValue}
          plugins={plugins}
          grow={!readOnly}
          {...this.props}
        />
        {!readOnly && <ClickablePadding onClick={this.focusAtEnd} grow />}
      </React.Fragment>
    );
  }
}

export default DocumentEditor;
