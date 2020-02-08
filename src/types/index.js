import PropTypes from "prop-types";

const { shape, number, string, oneOf, arrayOf, bool } = PropTypes;

export const nodeType = shape({
  id: number.isRequired,
  name: string.isRequired,
  childrenIds: arrayOf(PropTypes.number).isRequired,
  isSelected: bool.isRequired,
  radius: number.isRequired,
  yFixed: number.isRequired,
  status: oneOf([null, "root", "leaf"]).isRequired
});
