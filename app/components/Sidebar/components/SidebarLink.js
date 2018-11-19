// @flow
import * as React from 'react';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import { withRouter, NavLink } from 'react-router-dom';
import { CollapsedIcon } from 'outline-icons';
import styled, { withTheme } from 'styled-components';
import Flex from 'shared/components/Flex';

const StyledGoTo = styled(CollapsedIcon)`
  margin-bottom: -4px;
  margin-left: 1px;
  margin-right: -3px;
  ${({ expanded }) => !expanded && 'transform: rotate(-90deg);'};
`;

const IconWrapper = styled.span`
  margin-left: -4px;
  margin-right: 4px;
  height: 24px;
`;

const StyledNavLink = styled(NavLink)`
  display: flex;
  width: 100%;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 4px 0;
  margin-left: ${props => (props.icon ? '-20px;' : '0')};
  color: ${props => props.theme.slateDark};
  font-size: 15px;
  cursor: pointer;

  &:hover {
    color: ${props => props.theme.text};
  }
`;

type Props = {
  to?: string | Object,
  onClick?: (SyntheticEvent<*>) => *,
  children?: React.Node,
  icon?: React.Node,
  expand?: boolean,
  expandedContent?: React.Node,
  menu?: React.Node,
  menuOpen?: boolean,
  hideExpandToggle?: boolean,
  iconColor?: string,
  active?: boolean,
  theme: Object,
  exact?: boolean,
};

@observer
class SidebarLink extends React.Component<Props> {
  @observable expanded: boolean = false;
  activeStyle: Object;

  constructor(props) {
    super(props);

    this.activeStyle = {
      color: props.theme.black,
      fontWeight: 500,
    };
  }

  componentDidMount() {
    if (this.props.expand) this.handleExpand();
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.expand) this.handleExpand();
  }

  @action
  handleClick = (event: SyntheticEvent<*>) => {
    event.preventDefault();
    event.stopPropagation();
    this.expanded = !this.expanded;
  };

  @action
  handleExpand = () => {
    this.expanded = true;
  };

  render() {
    const {
      icon,
      children,
      onClick,
      to,
      expandedContent,
      expand,
      active,
      menu,
      menuOpen,
      hideExpandToggle,
      exact,
    } = this.props;
    const showExpandIcon =
      expandedContent && !hideExpandToggle ? true : undefined;

    return (
      <Wrapper menuOpen={menuOpen} column>
        <StyledNavLink
          icon={showExpandIcon}
          activeStyle={this.activeStyle}
          style={active ? this.activeStyle : undefined}
          onClick={onClick}
          exact={exact !== false}
          to={to}
          as={to ? undefined : 'div'}
        >
          {icon && <IconWrapper>{icon}</IconWrapper>}
          {showExpandIcon && (
            <StyledGoTo expanded={this.expanded} onClick={this.handleClick} />
          )}
          <Content onClick={this.handleExpand}>{children}</Content>
        </StyledNavLink>
        {/* Collection */ expand && hideExpandToggle && expandedContent}
        {/* Document */ this.expanded && !hideExpandToggle && expandedContent}
        {menu && <Action>{menu}</Action>}
      </Wrapper>
    );
  }
}

const Action = styled.span`
  position: absolute;
  right: 0;
  top: 2px;
  color: ${props => props.theme.slate};
  svg {
    opacity: 0.75;
  }

  &:hover {
    svg {
      opacity: 1;
    }
  }
`;

const Wrapper = styled(Flex)`
  position: relative;

  > ${Action} {
    display: ${props => (props.menuOpen ? 'inline' : 'none')};
  }

  &:hover {
    > ${Action} {
      display: inline;
    }
  }
`;

const Content = styled.div`
  width: 100%;
  max-height: 4em;
`;

export default withRouter(withTheme(SidebarLink));
