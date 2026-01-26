import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import { LoginInput, RegisterInput } from '../../types/auth';
import { useAuth } from '../../store/authStore';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

export const useLoginMutation = () => {
  const setTokens = useAuth((state) => state.setTokens);

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
    onError: (error: any) => {
      console.error('[AUTH] Login Mutation Error:', error);
     

      const errorData = error.response?.data;
      const msg = errorData?.message || errorData?.error || 'Login failed. Please try again.';
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
