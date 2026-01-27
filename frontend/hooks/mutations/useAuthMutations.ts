import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import { LoginInput, RegisterInput } from '../../types/auth';
import { useAuth } from '../../store/authStore';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

export const useLoginMutation = () => {
  const setTokens = useAuth((state) => state.setTokens);
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: (data) => {
      setTokens(data.token, data.refreshToken);
      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: 'Login successful',
      });
    },
    onError: async (error: any, variables) => {
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || '';

      // Check if error is "Email not verified" (403)
      if (statusCode === 403 && errorMessage.toLowerCase().includes('not verified')) {
        // Resend verification email and redirect to verify screen
        try {
          await authService.resendVerification({ email: variables.email });
          Toast.show({
            type: 'info',
            text1: 'Email Not Verified',
            text2: 'A new verification code has been sent to your email.',
          });
        } catch {
          Toast.show({
            type: 'info',
            text1: 'Email Not Verified',
            text2: 'Please verify your email to continue.',
          });
        }
        router.push({ pathname: '/auth/verify', params: { email: variables.email } } as any);
        return;
      }

      const msg = errorMessage || 'Login failed. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: msg,
      });
    },
  });
};

export const useRegisterMutation = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: RegisterInput) => authService.register(data),
    onSuccess: (data, variables) => {
      Toast.show({
        type: 'success',
        text1: 'Registration Successful',
        text2: 'Please check your email to verify your account.',
      });
      

      router.push({ pathname: '/auth/verify', params: { email: variables.email } } as any);
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      let msg = 'Registration failed.';
      if (errorData?.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
        msg = errorData.details[0].message;
      } else if (errorData?.message) {
        msg = errorData.message;
      } else if (errorData?.error) {
        msg = errorData.error;
      }
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: msg,
      });
    },
  });
};

export const useLogoutMutation = () => {
  const logoutStore = useAuth((state) => state.logout);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      logoutStore();
      queryClient.clear();
      router.replace('/auth/login' as any);
    },
  });
};
