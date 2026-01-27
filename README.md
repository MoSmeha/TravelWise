<div align="center">
  <img src="./readme/title1.svg" width="100%" />
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
- [Development & Testing](#tests)
- [Deployment](#deployment-map)

<br/>

<!-- project overview -->
<div id="overview" align="center">
  <img src="./readme/title2.svg" width="100%" />
</div>

> **TravelWise** is a smart travel companion that creates personalized trips, helps users discover hidden gems and local culture, and avoid tourist traps.
> It also lets travelers share experiences, making every journey easier and more enjoyable.

<br/>
## Tech Stack

<div align="center">
	<img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
	<img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
	<img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" />
	<img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" />
	<img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
	<img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" />
	<img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
	<img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
	<img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white" />
	<img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" />
	<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
	<img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" />
	<img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" />
</div>

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
  <img src="./readme/title3.svg" width="100%" />
</div>

### System Design

<div align="center">
  <img src="./readme/System_Design.png" style="max-width:100%; height:auto;" />
</div>

<br/>

### Entity Relationship Diagram

<div align="center">
  <img src="./readme/Database_Architecture.png" style="max-width:100%; height:auto;" />
</div>

<br/>

### TravelWise AI Agent

<a href="./readme/AI_Agent.png">
  <img src="./readme/AI_Agent.png" alt="Agent Flow" width="1200">
</a>

<br/>

### n8n Workflow

<div align="center">
  <img src="./readme/n8n.png" style="max-width:100%; height:auto;" />
</div>

<br/>

<!-- Project Highlights -->
<div align="center">
  <img src="./readme/title4.svg" width="100%" />
</div>

### Interesting Features

* **Real-time GPS & Sharing** — Share live location and routes
* **Smart Weather Logistics** — Automated calendar updates and personalized packing lists adapted to real-time weather forecasts (powered by n8n)

### Feature Figure
<img src="./readme/Interesting_features.png"/>

<br/>

<!-- User Screens -->
<div align="center">
  <img src="./readme/title5.svg" width="100%" />
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

#### Profile

<table align="center" width="100%">
  <tr>
    <th width="33%">User Profile</th>
    <th width="33%">Friends</th>
    <th width="33%">Profile Feed</th>
  </tr>
  <tr>
    <td><img src="./readme/profile/Profile.jpeg" width="100%" /></td>
    <td><img src="./readme/profile/Friends.jpeg" width="100%" /></td>
    <td><img src="./readme/profile/profile_feed.jpeg" width="100%" /></td>
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
  <img src="./readme/title6.svg" width="100%" />
</div>



### Tests

<table width="100%">
  <tr>
    <th>CI</th>
  </tr>
  <tr>
    <td align="center">
      <a href="./readme/CI/CI.png">
        <img src="./readme/CI/CI.png" alt="CI/CD" width="1200">
      </a>
    </td>
  </tr>
  <tr>
    <th>Testing</th>
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
  <img src="./readme/title7.svg" width="100%" />
</div>

### Deployment Map

| Deployment Flow                        |
| -------------------------------------- |
| ![Map](./readme/Docker_Deployment.png) |
