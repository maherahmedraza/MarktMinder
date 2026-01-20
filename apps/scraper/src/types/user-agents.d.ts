declare module 'user-agents' {
    interface UserAgentOptions {
        deviceCategory?: 'desktop' | 'mobile' | 'tablet';
    }

    class UserAgent {
        constructor(options?: UserAgentOptions);
        toString(): string;
        data: {
            userAgent: string;
            platform: string;
            device: string;
        };
    }

    export default UserAgent;
}
