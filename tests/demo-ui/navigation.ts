const router = { push: (url: string) => window.location.assign(url) };
export const useRouter = () => router;
