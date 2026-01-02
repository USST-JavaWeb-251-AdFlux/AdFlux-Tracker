import { request, type ApiResponse } from '@/utils/request';
import { createEnum, type ValueOf } from '@/utils/enum';

export const initPageViewApi = (body: {
    domain: string;
    categoryName: string;
    trackId: string;
}) => {
    return request<
        ApiResponse<{
            visitId: string;
        }>
    >('/track/page-view', {
        method: 'POST',
        body,
    });
};

export const updatePageViewApi = (body: { visitId: string; duration: number }) => {
    return request<ApiResponse<boolean>>('/track/page-view', {
        method: 'PUT',
        body,
    });
};

export const AdType = createEnum({
    image: { value: 0, label: '图片' },
    video: { value: 1, label: '视频' },
} as const);

export const AdLayout = createEnum({
    video: { value: 0, label: '视频' },
    banner: { value: 1, label: '横幅' },
    sidebar: { value: 2, label: '侧栏' },
} as const);

export const getAdForSlotApi = (body: {
    adLayout: ValueOf<typeof AdLayout>;
    adType: ValueOf<typeof AdType>;
    domain: string;
    trackId: string;
}) => {
    return request<
        ApiResponse<{
            adLayout: ValueOf<typeof AdLayout>;
            displayId: string;
            landingPage: string;
            mediaUrl: string;
            title: string;
        }>
    >('/track/ad-slot', {
        method: 'POST',
        body,
    });
};
