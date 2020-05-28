import PropTypes from "prop-types";

const { shape, number, string, oneOf, arrayOf, bool, oneOfType } = PropTypes;

export const nodeType = shape({
  id: number.isRequired,
  name: string.isRequired,
  childrenIds: arrayOf(PropTypes.number).isRequired,
  isSelected: bool.isRequired,
  radius: number.isRequired,
  yFixed: number.isRequired,
  status: oneOf([null, "root", "leaf"])
});

export const linkType = shape({
  source: oneOfType([number, nodeType]).isRequired,
  target: oneOfType([number, nodeType]).isRequired,
  id: string.isRequired
});

export const detailsType = shape({
  type: string.isRequired,
  retrId: number.isRequired,
  measureProvider: string.isRequired,
  measures: arrayOf(string).isRequired,
  partitioning: string.isRequired
});
