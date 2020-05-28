import React from "react";
import { Menu, Dropdown } from 'antd';
import { DownOutlined } from '@ant-design/icons';

const passLabel = ({ pass: passId, passType }) => `[${passId}] - ${passType}`;

// callback will be changePass()
// Passes are executed from higher to lower
const passChooser = (allQueries, currentPassId, callback) => {
  const allPassIds = allQueries
    .filter(query => query.parentId === null)
    .sort((a, b) => b.pass - a.pass);
  if (allPassIds.length > 1) {
    const activePass = allPassIds.find(p => p.pass === currentPassId);
    const dropName = activePass ? passLabel(activePass) : "Query pass";

    const menu = (
      <Menu>
        {allPassIds.map(pass => (
          <Menu.Item
            key={pass.pass}
            onClick={() => callback(pass.pass)}
          >
            {passLabel(pass)}
          </Menu.Item>
        ))}
      </Menu>
    );

    return (
      <Menu.Item key="pass">
        <Dropdown overlay={menu}>
          <a className="ant-dropdown-link" onClick={e => e.preventDefault()}>
            {passLabel(activePass)} <DownOutlined />
          </a>
        </Dropdown>
      </Menu.Item>
    );
  }
  return <></>;
};

export default passChooser;
