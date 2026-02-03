<div align="center">
  <img src="./readme/titles/title1.svg" width="100%" />
</div>

<br/>

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<br/>

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [System Design](#system-design)
- [Features](#interesting-features)
- [User Screens](#user-screens)
- [Optimizations](#optimizations)
- [Development & Testing](#tests)
- [Deployment](#deployment-map)

<br/>

<!-- project overview -->
<div id="overview" align="center">
  <img src="./readme/titles/title2.svg" width="100%" />
</div>
<br/>

> **TravelWise** is a smart travel companion that creates personalized trips, helps users discover hidden gems and local culture, and avoid tourist traps.
> It also lets travelers share experiences, making every journey easier and more enjoyable.

<br/>

## Project Structure

```bash
TravelWise/
├── backend/            # Express.js API + Prisma ORM
├── frontend/           # React Native Expo Application
├── AdminDashboard/     # React + Vite Web Dashboard
├── n8n/                # Workflow Automation Services
└── readme/             # Documentation Assets
```

<br/>

<!-- System Design -->
<div align="center">
  <img src="./readme/titles/title3.svg" width="100%" />
</div>

### System Design

<div align="center">
  <img src="./readme/diagrams/System_Design.png" style="max-width:100%; height:auto;" />
</div>

<br/>

### Backend Architecture

The backend is built using a **Modern Modular Architecture** that prioritizes **Separation of Concerns**, **Scalability**, and **Maintainability**. Instead of grouping files by type (controllers, services, etc.), I grouped them by **Module** (e.g., Auth, Itinerary, User) to keep related logic independent, inspired by the [Repository Pattern](https://blog.alexrusin.com/clean-architecture-in-node-js-implementing-the-repository-pattern-with-typescript-and-prisma/).

<div align="center">
  <img src="./readme/diagrams/Backend_Architecture.png" style="max-width:100%; height:auto;" alt="High Level Backend Architecture" />
</div>

<br/>

### Entity Relationship Diagram

<div align="center">
  <img src="./readme/diagrams/Database_Architecture.png" style="max-width:100%; height:auto;" />
</div>

<br/>

### TravelWise AI Agent

<a href="./readme/diagrams/AI_Agent.png">
  <img src="./readme/diagrams/AI_Agent.png" alt="Agent Flow" width="1200">
</a>

<br/>

### n8n Workflow

<div align="center">
  <img src="./readme/diagrams/n8n.png" style="max-width:100%; height:auto;" />
</div>

<br/>

<!-- Project Highlights -->
<div align="center">
  <img src="./readme/titles/title4.svg" width="100%" />
</div>

### Interesting Features

<img src="./readme/assets/Interesting_Features.png"/>

<br/>

<!-- User Screens -->
<div align="center">
  <img src="./readme/titles/title5.svg" width="100%" />
</div>

### User Screens

#### Authentication

<table align="center" width="100%">
  <tr>
    <th width="33%">Login</th>
    <th width="33%">Register</th>
    <th width="33%">Email<br/>Verification</th>
  </tr>
  <tr>
    <td><img src="./readme/auth/Login.jpeg" width="100%" /></td>
    <td><img src="./readme/auth/Register.jpeg" width="100%" /></td>
    <td><img src="./readme/auth/Email_Verfication.jpeg" width="100%" /></td>
  </tr>
</table>

<br/>

#### Feed & Activity

<table align="center" width="100%">
  <tr>
    <th width="33%">User Feed</th>
    <th width="33%">Notifications</th>
    <th width="33%">Chat</th>
  </tr>
  <tr>
    <td><img src="./readme/feed/UserFeed.jpeg" width="100%" /></td>
    <td><img src="./readme/communication/Notifications_Page.jpeg" width="100%" /></td>
    <td><img src="./readme/communication/ChatApp.jpeg" width="100%" /></td>
  </tr>
</table>

<br/>

#### Itinerary

<table align="center" width="100%">
  <tr>
    <th width="33%">Trip Map</th>
    <th width="33%">Hidden Gem Details</th>
    <th width="33%">Itinerary Details</th>
  </tr>
  <tr>
    <td><img src="./readme/itinerary_rag/Trip_Map.jpeg" width="100%" /></td>
    <td><img src="./readme/itinerary_rag/Hidden_Gem_Card.jpeg" width="100%" /></td>
    <td><img src="./readme/itinerary_rag/Itinerary_Details.jpeg" width="100%" /></td>
  </tr>
</table>

<br/>

### Application Demo

<table align="center" width="100%">
  <tr>
    <th width="33%">Login & Onboarding</th>
    <th width="33%">Gmail Verification</th>
    <th width="33%">Creating Post</th>
  </tr>
  <tr>
    <td><img src="./readme/gifs/LoginOnboarding.gif" width="100%" /></td>
    <td><img src="./readme/gifs/Gmail_Verification.gif" width="100%" /></td>
    <td><img src="./readme/gifs/Creating_Post.gif" width="100%" /></td>
  </tr>
</table>

<br/>

<table align="center" width="100%">
  <tr>
    <th width="33%">Live Location & Gems</th>
    <th width="33%">GPS Sharing</th>
    <th width="33%">AI Chatbot</th>
  </tr>
  <tr>
    <td><img src="./readme/gifs/HiddenGem_Card_&Live_Location.gif" width="100%" /></td>
    <td><img src="./readme/gifs/ItineraryGPS_Sharing.gif" width="100%" /></td>
    <td><img src="./readme/gifs/Rag_Chatbot.gif" width="100%" /></td>
  </tr>
</table>

<br/>

### Admin Dashboard

<table align="center" width="100%">
  <tr>
    <th width="33%">Admin Login</th>
    <th width="33%">Dashboard Overview</th>
    <th width="33%">User Management</th>
  </tr>
  <tr>
    <td><img src="./readme/admin/Admin_Login.png" width="100%" /></td>
    <td><img src="./readme/admin/Admin_Dashboard.png" width="100%" /></td>
    <td><img src="./readme/admin/Admin_Users_Table.png" width="100%" /></td>
  </tr>
</table>

<br/>

<!-- Development & Testing -->
<div align="center">
  <img src="./readme/titles/title6.svg" width="100%" />
</div>

<br/>

### Optimizations

<div id="optimizations"></div>
<table align="center" width="100%">
  <thead>
    <tr>
      <th width="50%">Frontend</th>
      <th width="50%">Backend</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Memoization:</strong> Use <code>useMemo</code> & <code>useCallback</code> to prevent unnecessary re-renders.</td>
      <td><strong>API Caching:</strong> Use <code>node-cache</code> with TTL strategies for Google Places & Weather API responses.</td>
    </tr>
    <tr>
      <td><strong>Smart Caching:</strong> Use <strong>React Query</strong> for efficient server-state caching and background updates.</td>
      <td><strong>Database Indexing:</strong> Prisma <code>@@index</code> on frequently queried fields for faster queries.</td>
    </tr>
  </tbody>
</table>

### Tests

<table width="100%">
  <tr>
    <th>CI/CD</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./readme/CI/CI-CD.png">
        <img src="./readme/CI/CI-CD.png" alt="CI/CD" width="1200">
      </a>
    </td>
  </tr>
  <tr>
    <th>Unit Tests Using Vitest</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./readme/CI/Passed_Tests.png">
        <img src="./readme/CI/Passed_Tests.png" alt="Testing" width="1200">
      </a>
    </td>
  </tr>
</table>

<br/>

<!-- Deployment -->
<div align="center">
  <img src="./readme/titles/title7.svg" width="100%" />
</div>

### Deployment Map

| Deployment Flow                        |
| -------------------------------------- |
| ![Map](./readme/diagrams/Docker_Deployment.png) |

<br/>

| AWS EC2 Server Running                    |
| ----------------------------------------- |
| ![Server](./readme/CI/Server_Running.png) |

<br/>

### AMA Chatbot

Additionally, I made this chatbot to answer questions regarding me and my SE Factory experience. You can try it out [here](https://ama-chatbot.vercel.app/).  
Built with **Supabase**, **React**, and **Express**.

<div align="center">
  <a href="https://ama-chatbot.vercel.app/">
    <img src="./readme/assets/AMA-Chatbot.png" style="max-width:100%; height:auto;" />
  </a>
</div>
