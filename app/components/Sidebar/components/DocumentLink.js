// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import Document from 'models/Document';
import SidebarLink from './SidebarLink';
import DropToImport from 'components/DropToImport';
import Flex from 'shared/components/Flex';
import { type NavigationNode } from 'types';

type Props = {
  document: NavigationNode,
  history: Object,
  activeDocument: ?Document,
  activeDocumentRef?: (?HTMLElement) => *,
  prefetchDocument: (documentId: string) => Promise<void>,
  depth: number,
};

@observer
class DocumentLink extends React.Component<Props> {
  handleMouseEnter = (ev: SyntheticEvent<*>) => {
    const { document, prefetchDocument } = this.props;

    ev.stopPropagation();
    ev.preventDefault();
    prefetchDocument(document.id);
  };

  render() {
    const {
      document,
      activeDocument,
      activeDocumentRef,
      prefetchDocument,
      depth,
      history,
    } = this.props;

    const isActiveDocument =
      activeDocument && activeDocument.id === document.id;
    const showChildren = !!(
      activeDocument &&
      (activeDocument.pathToDocument
        .map(entry => entry.id)
        .includes(document.id) ||
        isActiveDocument)
    );

    return (
      <Flex
        column
        key={document.id}
        ref={isActiveDocument ? activeDocumentRef : undefined}
        onMouseEnter={this.handleMouseEnter}
      >
        <DropToImport
          history={history}
          documentId={document.id}
          activeClassName="activeDropZone"
        >
          <SidebarLink
            to={{
              pathname: document.url,
              state: { title: document.title },
            }}
            expand={showChildren}
            expandedContent={
              document.children.length ? (
                <DocumentChildren column>
                  {document.children.map(childDocument => (
                    <DocumentLink
                      key={childDocument.id}
                      history={history}
                      document={childDocument}
                      activeDocument={activeDocument}
                      prefetchDocument={prefetchDocument}
                      depth={depth + 1}
                    />
                  ))}
                </DocumentChildren>
              ) : (
                undefined
              )
            }
          >
            {document.title}
          </SidebarLink>
        </DropToImport>
      </Flex>
    );
  }
}

const DocumentChildren = styled(Flex)`
  margin-top: -4px;
  margin-left: 12px;
`;

export default DocumentLink;
