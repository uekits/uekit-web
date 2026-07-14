/**
 * Avatar 的公开 Props 契约。
 */

/** Avatar 公开属性。 */
export interface AvatarProps {
    /** 用于生成文字回退和默认无障碍名称。 */
    name?: string;
    /** 图片地址；加载失败或尚未完成时显示文字回退。 */
    src?: string;
    /** Element Plus 头像尺寸，单位为像素。 */
    size?: number;
    /** 图片的无障碍替代文本。 */
    alt?: string;
}
