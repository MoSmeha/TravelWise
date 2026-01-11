// This file is strictly for type definitions
import "expo-router";

declare module "expo-router" {
  export interface RelativePathString {
    "/auth/login": string;
    "/auth/register": string;
    "/auth/verify": string;
    "/(tabs)": string;
  }
}
