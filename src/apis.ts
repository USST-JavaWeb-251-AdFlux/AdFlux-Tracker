import { createEnum, type ValueOf } from '@/utils/enum';
import { request, type ApiResponse } from '@/utils/request';

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

export type AdResult = {
    adLayout: ValueOf<typeof AdLayout>;
    displayId: string;
    landingPage: string;
    mediaUrl: string;
    title: string;
};

export const getAdForSlotApi = (body: {
    adLayout: ValueOf<typeof AdLayout>;
    adType: ValueOf<typeof AdType>;
    domain: string;
    trackId: string;
}) => {
    return request<ApiResponse<AdResult>>('/track/ad-slot', {
        method: 'POST',
        body,
    });
};

export const AdClicked = createEnum({
    notClicked: { value: 0, label: '未点击' },
    clicked: { value: 1, label: '点击' },
} as const);

export const updateAdDisplayApi = (
    displayId: string,
    body: { duration: number; clicked: ValueOf<typeof AdClicked> },
) => {
    return request<ApiResponse<boolean>>(`/track/ad-slot/${displayId}`, {
        method: 'PUT',
        body,
    });
};
