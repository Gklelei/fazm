import { MailtrapClient } from "mailtrap"

const api_key = process.env.MAILTRAP_API_KEY as string
const isSandbox = process.env.MAILTRAP_IS_SANDBOX === "true"
const inBoxId = isSandbox ? Number(process.env.MAILTRAP_INBOX_ID) : undefined


const client = new MailtrapClient(
    {
        token: api_key,
        sandbox: isSandbox,
        testInboxId: inBoxId
    }
)

interface SendMAilProps {
    to: string[];
    subject: string;
    text: string;
    html: string;
}


export const SendMail = async ({ to, subject, text, html }: SendMAilProps): Promise<ActionResult> => {
    try {
        await client.send({
            from: {
                email: isSandbox ? "sandbox@example.com" : "mail@cescawr.org",
                name: "Fazam Football Academy"
            },
            to: [
                ...to.map((email) => ({
                    email
                }))
            ],
            subject: subject,
            text: text,
            html: html
        })

        return {
            success: true,
            message: "Email sent successfully"
        }
    } catch (error) {
        console.log(error)
        return {
            success: false,
            message: "Failed to send email"
        }
    }
}