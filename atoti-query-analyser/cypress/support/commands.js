// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

const findLastChar = input => {
  for (let i = input.length - 1; i >= 0; i -= 1) {
    if (/\S/.test(input[i])) {
      return i;
    }
  }
  throw new Error(`No char`);
};

const loadInputInForm = content => {
  const lastIndex = findLastChar(content);
  cy.get("#query-input")
    .invoke("val", content.substring(0, lastIndex))
    .trigger("change")
    .type(content[lastIndex]);
};

Cypress.Commands.add("loadTextInput", (inputFile) => {
  cy.fixture(`exports/${inputFile}`).then(input => {
    loadInputInForm(input);
  });
});

Cypress.Commands.add("loadJsonInput", (inputFile) => {
  cy.fixture(`exports/${inputFile}`).then(input => {
    // Setting the content in two steps, as using val(..) then triggering changes was sometimes failing
    const content = JSON.stringify(input);
    loadInputInForm(content);
  });
});
