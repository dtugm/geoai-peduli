import { LandCoverOptions } from "@/constant/landcover.constant";

export const generateHGUPopupHTML = (props: any): string => {
    return `
        <div style="
            font-family: 'Inter', 'Segoe UI', sans-serif;
            width: 280px;
            padding: 14px 16px;
            border-radius: 12px;
            background:
                linear-gradient(#ffffff, #ffffff) padding-box,
                linear-gradient(135deg, #0077FF, #00A86B) border-box;
            border: 2px solid transparent;
        ">
        
            <!-- Header -->
            <div style="margin-bottom: 14px;">
                <div style="
                    font-size: 14px;
                    font-weight: 700;
                    margin-bottom: 2px;
                    background: linear-gradient(135deg, #0077FF, #00A86B);
                    -webkit-background-clip: text;
                    color: transparent;
                ">
                    ${props.pemegangHak || '-'}
                </div>

                <div style="font-size: 12px; color: #6b7280;">
                    ${props.nomorHak || '-'}
                </div>
            </div>

            <div style="height: 1px; background: #f1f5f9; margin-bottom: 12px;"></div>

            <!-- Content -->
            <div style="font-size: 12px; color: #374151; line-height: 1.7;">
                <div style="margin-bottom: 6px;">
                    <span style="color:#9ca3af;">Lokasi:</span> ${props.kantah || '-'}
                </div>

                <div style="margin-bottom: 6px;">
                    <span style="color:#9ca3af;">Luas:</span>
           <strong style="color:#00A86B;">
  ${(() => {
            const val = props.luasTertulis || props.luas || props.luasPeta;
            return val
                ? parseFloat(val).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' Ha'
                : '-';
        })()
        }
</strong>
                </div>

                <div style="margin-bottom: 6px;">
                    <span style="color:#9ca3af;">Penggunaan:</span> ${props.penggunaan || '-'}
                </div>

                <div style="margin-bottom: 6px;">
                    <span style="color:#9ca3af;">Periode:</span> 
                    ${props.validSejak || '-'} – ${props.berakhirHak || '-'}
                </div>

                <div>
                    <span style="color:#9ca3af;">Status:</span>
                    <span style="
                        font-weight: 600;
                        color: ${props.statusBT === 'Aktif' ? '#00A86B' : '#f59e0b'};
                    ">
                        ${props.statusBT || '-'}
                    </span>
                </div>
            </div>

        </div>
    `;
};
export const generateSimpleClassHTML = (props: any): string => {
    const landCover = LandCoverOptions.find((lc) => lc.id === props.nmr_kls);
    const label =
        props.kelas ||
        props.class_name ||
        landCover?.label ||
        "-";

    const areaHa =
        props.area_ha ??
        props.luas_ha ??
        props.area ??
        null;

    const formattedArea = areaHa
        ? parseFloat(areaHa).toLocaleString("id-ID", { maximumFractionDigits: 2 })
        : "-";

    return `
        <div style="
            font-family: 'Inter', 'Segoe UI', sans-serif;
            width: 200px;
            padding: 14px 16px;
            border-radius: 12px;
            background:
                linear-gradient(rgba(17, 24, 39, 0.5), rgba(17, 24, 39, 0.5)) padding-box,
                linear-gradient(135deg, #0077FF, #00A86B) border-box;
            border: 2px solid transparent;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        ">
        
            <div style="margin-bottom: 4px;">
                <div style="
                    font-size: 14px;
                    font-weight: 700;
                    margin-bottom: 2px;
                    color: #ffffff;
                ">
                    ${label}
                </div>
            </div>

            <div style="height: 1px; background: rgba(255, 255, 255, 0.1); margin-bottom: 4px;"></div>

            <div style="font-size: 12px; color: #ffffff; line-height: 1.7;">
                <div>
                    <span style="color:#9ca3af;">Luas Area:</span>
                    <strong style="color:#00A86B;">
                        ${formattedArea} Ha
                    </strong>
                </div>
            </div>

        </div>
    `;
};


export const generateSimpleClassHTMLLandCover = (props: any): string => {
    return `
        <div style="
            font-family: 'Inter', 'Segoe UI', sans-serif;
            width: 200px;
            padding: 14px 16px;
            border-radius: 12px;
            background:
                linear-gradient(rgba(17, 24, 39, 0.5), rgba(17, 24, 39, 0.5)) padding-box,
                linear-gradient(135deg, #0077FF, #00A86B) border-box;
            border: 2px solid transparent;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        ">
        
            <!-- Header -->
            <div style="margin-bottom: 4px;">
                <div style="
                    font-size: 14px;
                    font-weight: 700;
                    margin-bottom: 2px;
                    color: #ffffff;
                ">
                    ${props.kelas || '-'}
                </div>
            </div>

            <div style="height: 1px; background: rgba(255, 255, 255, 0.1); margin-bottom: 4px;"></div>

            <!-- Content -->
            <div style="font-size: 12px; color: #ffffff; line-height: 1.7;">
                <div>
                    <span style="color:#9ca3af;">Luas Area:</span>
                    <strong style="color:#00A86B;">
                        ${props.area_ha ? parseFloat(props.area_ha).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '-'} Ha
                    </strong>
                </div>
            </div>

        </div>
    `;
};

