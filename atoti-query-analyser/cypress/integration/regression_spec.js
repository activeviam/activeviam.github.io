// / <reference types="cypress" />

describe("Summary view", () => {
  it(`displays measures even if not many`, () => {
    cy.visit("http://localhost:3000");

    cy.loadTextInput('small-plan-v1.txt');

    cy.contains("Import from V1").click();
    cy.contains("MDX pass Select");

    cy.contains('ChunkSize.SUM');
  });
});
