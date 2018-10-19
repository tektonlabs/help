// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import invariant from 'invariant';
import styled from 'styled-components';
import { GoToIcon } from 'outline-icons';
import Flex from 'shared/components/Flex';

import Document from 'models/Document';

const ResultWrapper = styled.div`
  display: flex;
  margin-bottom: 10px;

  color: ${props => props.theme.text};
  cursor: default;
`;

const StyledGoToIcon = styled(GoToIcon)``;

const ResultWrapperLink = ResultWrapper.withComponent('a').extend`
  height: 32px;
  padding-top: 3px;
  padding-left: 5px;

  &:hover,
  &:active,
  &:focus {
    margin-left: 0px;
    border-radius: 2px;
    background: ${props => props.theme.black};
    color: ${props => props.theme.smokeLight};
    outline: none;
    cursor: pointer;

    ${StyledGoToIcon} {
      fill: ${props => props.theme.white};
    }
  }
`;

type Props = {
  result: Object,
  document?: Document,
  onSuccess?: Function,
  ref?: Function,
};

@observer
class PathToDocument extends React.Component<Props> {
  handleClick = async (ev: SyntheticEvent<*>) => {
    ev.preventDefault();
    const { document, result, onSuccess } = this.props;

    invariant(onSuccess && document, 'onSuccess unavailable');

    if (result.type === 'document') {
      await document.move(result.id);
    } else if (
      result.type === 'collection' &&
      result.id === document.collection.id
    ) {
      await document.move(null);
    } else {
      throw new Error('Not implemented yet');
    }
    onSuccess();
  };

  render() {
    const { result, document, ref } = this.props;
    const Component = document ? ResultWrapperLink : ResultWrapper;

    if (!result) return <div />;

    return (
      <Component innerRef={ref} onClick={this.handleClick} selectable href>
        {result.path
          .map(doc => <span key={doc.id}>{doc.title}</span>)
          .reduce((prev, curr) => [prev, <StyledGoToIcon />, curr])}
        {document && (
          <Flex>
            {' '}
            <StyledGoToIcon /> {document.title}
          </Flex>
        )}
      </Component>
    );
  }
}

export default PathToDocument;
