# COBOL Account Management System

## Purpose

This program provides a small, menu-driven account balance manager. It supports viewing the balance, crediting the account, debiting the account, and exiting. The current implementation manages one account only; it does not store student identities, account records, or student-specific details.

## Source files

- [`main.cob`](../src/cobol/main.cob) contains `MainProgram`, the interactive entry point. It displays the menu, accepts a choice, and dispatches view, credit, and debit requests to `Operations`. Choice 4 exits; other choices display an invalid-choice message.
- [`operations.cob`](../src/cobol/operations.cob) contains `Operations`, which handles the requested account action. It reads the amount for credits and debits, retrieves and updates the balance through `DataProgram`, and displays the result. A debit is declined when the requested amount is greater than the available balance.
- [`data.cob`](../src/cobol/data.cob) contains `DataProgram`, the balance storage interface. It supports `READ` to copy the stored balance to the caller and `WRITE` to replace the stored balance. The stored balance is initialized to `1000.00`.

## Business rules currently implemented

- The account starts with a balance of `1000.00`.
- A credit adds the entered amount to the balance.
- A debit subtracts the entered amount only when the balance is greater than or equal to the entered amount. Otherwise, the program displays an insufficient-funds message and leaves the balance unchanged.
- Balances and amounts use `PIC 9(6)V99`: up to six integer digits and two decimal digits, with an implied decimal point.
- There is no student-specific logic or per-student balance. The balance is held in COBOL working storage rather than a persistent database or file.
- The program does not explicitly validate that an entered amount is positive or handle input-format errors; those behaviors are not defined as business rules here.

## Application data flow

```mermaid
sequenceDiagram
    actor User
    participant Main as MainProgram
    participant Ops as Operations
    participant Data as DataProgram

    actor User
    participant Main as MainProgram
    participant Ops as Operations
    participant Data as DataProgram

    loop Until the user exits
        Main->>User: Display menu and prompt
        User->>Main: Enter menu choice
        alt Choice 1: View balance
            Main->>Ops: CALL Operations(TOTAL)
            Ops->>Data: CALL DataProgram(READ, balance)
            Data-->>Ops: Return stored balance
            Ops-->>User: Display current balance
        else Choice 2: Credit account
            Main->>Ops: CALL Operations(CREDIT)
            Ops->>User: Prompt for credit amount
            User-->>Ops: Enter amount
            Ops->>Data: CALL DataProgram(READ, balance)
            Data-->>Ops: Return stored balance
            Ops->>Ops: Add amount to balance
            Ops->>Data: CALL DataProgram(WRITE, balance)
            Data->>Data: Replace stored balance
            Ops-->>User: Display new balance
        else Choice 3: Debit account
            Main->>Ops: CALL Operations(DEBIT)
            Ops->>User: Prompt for debit amount
            User-->>Ops: Enter amount
            Ops->>Data: CALL DataProgram(READ, balance)
            Data-->>Ops: Return stored balance
            alt Balance covers debit
                Ops->>Ops: Subtract amount from balance
                Ops->>Data: CALL DataProgram(WRITE, balance)
                Data->>Data: Replace stored balance
                Ops-->>User: Display new balance
            else Insufficient funds
                Ops-->>User: Display insufficient-funds message
            end
        else Choice 4: Exit
            Main->>Main: Set continue flag to NO
            Main-->>User: Display exit message
        else Invalid choice
            Main-->>User: Display invalid-choice message
        end
    end
```
