import React from "react";
import PropTypes from "prop-types";
import { Layout, Menu } from 'antd';
const { Header } = Layout;


const NavBar = ({ navigate, goBackButton, passChooser }) => {
  return (
    <Header>
      <div className="logo" />
      <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['2']}>
          <Menu.Item key="input" onClick={() => navigate("input")}>
            Input
          </Menu.Item>
          <Menu.Item key="summary" onClick={() => navigate("summary")}>
            Summary
          </Menu.Item>
          <Menu.Item key="graph" onClick={() => navigate("graph")}>
            Graph
          </Menu.Item>
          <Menu.Item key="timeline" onClick={() => navigate("timeline")}>
            Timeline
          </Menu.Item>
          {passChooser}
          {goBackButton}
      </Menu>
    </Header>
  );
};

NavBar.propTypes = {
  navigate: PropTypes.func.isRequired,
  goBackButton: PropTypes.element.isRequired,
  passChooser: PropTypes.element.isRequired
};

export default NavBar;
