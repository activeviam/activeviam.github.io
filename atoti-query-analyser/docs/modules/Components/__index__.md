# /modules/Components 

[Parent directory](../__index__.md)


## Table of contents 
* [Details](#__autogen_7__)
* [ErrorBoundary](#__autogen_8__)
* [Graph](#__autogen_9__)
* [Input](#__autogen_10__)
* [NavBar](#__autogen_11__)
* [Notification](#__autogen_12__)
* [Summary](#__autogen_13__)
* [Timeline](#__autogen_14__)


## Details <a id="__autogen_7__"></a>
# src/Components/Details/Details.tsx

This component is responsible for displaying data about retrieval.

Tasks:

* Output of available data about retrieval;
* Custom representation of some properties (location, start time, elapsed time).

[More info](Details/__index__.md)


## ErrorBoundary <a id="__autogen_8__"></a>
# src/Components/ErrorBoundary/ErrorBoundary.tsx

This is a helper component used to handle rendering errors.

Tasks:

* If an error occurs while rendering one of the child React components, that component catches it, replaces its content
  with an error message, and sends a message to the notification service.

[More info](ErrorBoundary/__index__.md)


## Graph <a id="__autogen_9__"></a>
_No summary provided!_

[More info](Graph/__index__.md)


## Input <a id="__autogen_10__"></a>
# src/Components/Input/Input.tsx

This component is designed to enter user data.

Tasks:

* Select data type (V1, JSON, remote server);
* Choice of input mode (Classic, Developer);
* Developer mode: saving and loading data from LocalStorage.

[More info](Input/__index__.md)


## NavBar <a id="__autogen_11__"></a>
_No summary provided!_

[More info](NavBar/__index__.md)


## Notification <a id="__autogen_12__"></a>
# src/Components/Notification/NotificationWrapper.tsx

This component is responsible for rendering notifications.

Tasks:

* Drawing notifications;
* Providing a service for sending notifications through the `useNotificationContext()` hook;

[More info](Notification/__index__.md)


## Summary <a id="__autogen_13__"></a>
# src/Components/Summary/Summary.tsx

This component is responsible for displaying query statistics.

Tasks:

* Displaying statistics on requests:
    * Number of Retrievals;
    * The total amount of data from external retrievals;
    * Working hours;
    * List of measures;
    * Distribution of retrievals by type;
    * Distribution of retrievals by type of partitioning;
    * Distribution of the size of the result by type of partitioning;
    * List of partial providers.
* Output global statistics for all requests within a single pass.

[More info](Summary/__index__.md)


## Timeline <a id="__autogen_14__"></a>
# src/Components/Timeline/Timeline.tsx

This component is responsible for presenting data on the execution of a request in the form of a timing diagram.

Tasks:

* Building a time diagram for this request;
* Display information about retrievals by clicking on the corresponding rectangle.

[More info](Timeline/__index__.md)
